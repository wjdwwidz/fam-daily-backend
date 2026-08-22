import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media, MediaItem } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { StorageService } from '../uploads/storage.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    private readonly storage: StorageService,
  ) {}

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
