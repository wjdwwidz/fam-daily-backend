import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PendingUpload } from '../entities/pending-upload.entity';
import { CommitUploadDto, PrepareUploadDto } from './dto/media.dto';
import { Media, MediaItem } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { StorageService } from '../uploads/storage.service';

// 개당 최대 크기. 컨트롤러의 multipart 경로와 같은 값을 쓴다.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(PendingUpload)
    private readonly pending: Repository<PendingUpload>,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  // ── 직접 업로드 (2단계 커밋) ───────────────────────────────────────
  //
  // 파일 바이트가 서버를 거치지 않는다. 서버는 올릴 자리(경로)만 내주고,
  // 나중에 "그 자리로 글을 만들어달라"는 말만 듣는다.
  //
  //   ① prepare  자리 발급 + PendingUpload 기록 + 서명 URL 반환
  //   ② upload   클라이언트 → Supabase (서버 관여 없음)
  //   ③ commit   객체 존재 확인 → Media 생성 + PendingUpload 삭제 (한 트랜잭션)
  //   ④ sweep    ③ 이 오지 않은 자리를 나중에 청소 (SweepService)
  //
  // ③ 이 오지 않는 경우가 실패보다 훨씬 흔하다 — 앱 종료, 네트워크 끊김,
  // 사용자가 그냥 뒤로 가기. 그때 서버에서는 아무 일도 일어나지 않으므로
  // 시간이 지난 뒤 훑는 것 말고는 정리할 방법이 없다.

  async prepareUpload(userId: string, groupId: string, dto: PrepareUploadDto) {
    await this.assertMember(userId, groupId);
    const rows = dto.files.map((f) => {
      if (!/^(image|video)\//.test(f.contentType)) {
        throw new BadRequestException('사진이나 영상만 올릴 수 있습니다.');
      }
      if (f.size && f.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `파일 하나는 ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB 까지 올릴 수 있어요.`,
        );
      }
      return this.pending.create({
        path: this.storage.buildPath(`media/${groupId}`, f.fileName ?? '', f.contentType),
        groupId,
        userId,
        contentType: f.contentType,
        size: String(f.size ?? 0),
      });
    });
    const saved = await this.pending.save(rows);
    return Promise.all(
      saved.map(async (r) => {
        const signed = await this.storage.createSignedUpload(r.path);
        return { uploadId: r.id, path: r.path, signedUrl: signed.signedUrl };
      }),
    );
  }

  async commitUpload(userId: string, groupId: string, dto: CommitUploadDto) {
    const membership = await this.assertMember(userId, groupId);
    const rows = await this.pending.find({ where: { id: In(dto.uploadIds) } });

    // 남의 자리로 글을 만들지 못하게 한다
    if (rows.length !== dto.uploadIds.length) {
      throw new BadRequestException('만료되었거나 없는 업로드입니다. 다시 시도해주세요.');
    }
    for (const r of rows) {
      if (r.userId !== userId || r.groupId !== groupId) {
        throw new ForbiddenException('내가 준비한 업로드가 아닙니다.');
      }
    }

    // 클라이언트가 보낸 순서를 유지한다
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = dto.uploadIds.map((id) => byId.get(id)!);

    // 실제로 올라왔는지 확인
    for (const r of ordered) {
      if (!(await this.storage.existsAt(r.path))) {
        throw new BadRequestException('아직 올라오지 않은 파일이 있어요.');
      }
    }

    const items: MediaItem[] = ordered.map((r) => ({
      url: this.storage.publicUrlFor(r.path),
      type: /^video\//.test(r.contentType) ? 'video' : 'image',
    }));

    // Media 생성과 PendingUpload 삭제를 한 트랜잭션으로 묶는다.
    // 나뉘면 "글은 있는데 pending 도 남은" 상태가 되고, 스윕이 살아 있는
    // 파일을 지워버릴 수 있다.
    const saved = await this.dataSource.transaction(async (m) => {
      const row = await m.save(
        m.create(Media, {
          items,
          caption: dto.caption ?? '',
          groupId,
          authorId: membership.id,
        }),
      );
      await m.delete(PendingUpload, { id: In(ordered.map((r) => r.id)) });
      return row;
    });
    return this.getOne(userId, saved.id);
  }


  // 그룹의 일상 사진 목록 (최신순)
  async list(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const rows = await this.media.find({
      where: { groupId },
      relations: { author: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((m) => this.serialize(m));
  }

  // 업로드 + 기록을 한 요청으로 묶는다.
  // 나눠 부르면 업로드만 성공했을 때 아무도 참조하지 않는 파일이 버킷에 남는다.
  // 중간에 실패하면 그때까지 올린 파일을 전부 되돌린다.
  async createWithFiles(
    userId: string,
    groupId: string,
    files: Express.Multer.File[],
    caption: string,
  ) {
    const membership = await this.assertMember(userId, groupId);
    const items: MediaItem[] = [];
    try {
      for (const file of files) {
        const url = await this.storage.upload(file, 'media');
        items.push({
          url,
          type: /^video\//.test(file.mimetype) ? 'video' : 'image',
        });
      }
      const saved = await this.media.save(
        this.media.create({
          items,
          caption: caption ?? '',
          groupId,
          authorId: membership.id,
        }),
      );
      return this.getOne(userId, saved.id);
    } catch (e) {
      // 업로드했지만 글로 남지 못한 파일들을 정리한다
      for (const it of items) await this.storage.removeByUrl(it.url);
      throw e;
    }
  }

  async getOne(userId: string, mediaId: string) {
    const row = await this.media.findOne({
      where: { id: mediaId },
      relations: { author: { user: true } },
    });
    if (!row) throw new NotFoundException('사진을 찾을 수 없습니다.');
    await this.assertMember(userId, row.groupId);
    return this.serialize(row);
  }

  // 올린 본인만 삭제할 수 있다. 사진·영상 파일도 함께 정리한다.
  async remove(userId: string, mediaId: string) {
    const row = await this.media.findOne({
      where: { id: mediaId },
      relations: { author: { user: true } },
    });
    if (!row) throw new NotFoundException('사진을 찾을 수 없습니다.');
    await this.assertMember(userId, row.groupId);
    if (row.author?.user?.id !== userId) {
      throw new ForbiddenException('내가 올린 사진만 삭제할 수 있습니다.');
    }
    const urls = this.itemsOf(row).map((i) => i.url);
    await this.media.remove(row);
    for (const url of urls) await this.storage.removeByUrl(url);
    return { ok: true };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  // 예전 한 장짜리 글은 photoUrl 컬럼에만 값이 있다. 읽을 때 items 모양으로 맞춘다.
  private itemsOf(m: Media): MediaItem[] {
    if (m.items?.length) return m.items;
    return m.photoUrl ? [{ url: m.photoUrl, type: 'image' }] : [];
  }

  private serialize(m: Media) {
    const items = this.itemsOf(m);
    return {
      id: m.id,
      items,
      // 목록에서 대표로 쓸 첫 장
      coverUrl: items[0]?.url ?? null,
      caption: m.caption,
      createdAt: m.createdAt,
      author: m.author
        ? {
            userId: m.author.user?.id ?? null,
            nickname: m.author.nickname,
            name: m.author.user?.name ?? '',
            photoUrl: m.author.user?.photoUrl ?? null,
          }
        : null,
    };
  }
}
