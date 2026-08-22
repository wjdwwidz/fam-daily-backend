import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { StorageService } from '../uploads/storage.service';
import { CreateMediaDto } from './dto/media.dto';

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

  // 사진 업로드 + 기록을 한 요청으로 묶는다.
  // 나눠 부르면 업로드만 성공했을 때 아무도 참조하지 않는 파일이 버킷에 남는다.
  // DB 기록이 실패하면 방금 올린 파일을 되돌린다.
  async createWithFile(
    userId: string,
    groupId: string,
    file: Express.Multer.File,
    caption: string,
  ) {
    const membership = await this.assertMember(userId, groupId);
    const photoUrl = await this.storage.upload(file, 'media');
    let saved: Media;
    try {
      saved = await this.media.save(
        this.media.create({
          photoUrl,
          caption: caption ?? '',
          groupId,
          authorId: membership.id,
        }),
      );
    } catch (e) {
      await this.storage.removeByUrl(photoUrl);
      throw e;
    }
    return this.getOne(userId, saved.id);
  }

  // 이미 업로드된 URL 로 등록 (업로드를 따로 한 경우)
  async create(userId: string, groupId: string, dto: CreateMediaDto) {
    const membership = await this.assertMember(userId, groupId);
    const saved = await this.media.save(
      this.media.create({
        photoUrl: dto.photoUrl,
        caption: dto.caption ?? '',
        groupId,
        authorId: membership.id,
      }),
    );
    return this.getOne(userId, saved.id);
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

  // 올린 본인만 삭제할 수 있다. 사진 파일도 함께 정리한다.
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
    const photoUrl = row.photoUrl;
    await this.media.remove(row);
    await this.storage.removeByUrl(photoUrl);
    return { ok: true };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }

  private serialize(m: Media) {
    return {
      id: m.id,
      photoUrl: m.photoUrl,
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
