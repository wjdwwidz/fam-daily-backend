import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BucketItem } from '../entities/bucket-item.entity';
import { Media } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { SaveBucketDto } from './dto/bucket.dto';

// 버킷리스트는 1~100 번 칸으로 이루어진다. 빈 칸은 행이 없고, 화면이 1~100 을 그린다.
export const BUCKET_SIZE = 100;

@Injectable()
export class BucketService {
  constructor(
    @InjectRepository(BucketItem)
    private readonly items: Repository<BucketItem>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(Media) private readonly media: Repository<Media>,
  ) {}

  async list(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const rows = await this.items.find({
      where: { groupId },
      relations: { doneBy: { user: true }, media: true },
      order: { no: 'ASC' },
    });
    return {
      size: BUCKET_SIZE,
      doneCount: rows.filter((r) => r.doneAt).length,
      items: rows.map((r) => this.toDto(r)),
    };
  }

  // 한 칸 쓰기/고치기. 같은 번호가 있으면 덮어쓴다.
  async save(userId: string, groupId: string, no: number, dto: SaveBucketDto) {
    const me = await this.assertMember(userId, groupId);
    this.assertNo(no);

    let row = await this.items.findOne({ where: { groupId, no } });
    if (!row) row = this.items.create({ groupId, no });
    row.text = dto.text.trim();

    if (dto.done !== undefined) {
      // 이미 달성한 칸을 다시 저장할 때 달성 시각이 밀리지 않게, 상태가 바뀔 때만 손댄다
      if (dto.done && !row.doneAt) {
        row.doneAt = new Date();
        row.doneById = me.id;
      } else if (!dto.done) {
        row.doneAt = null;
        row.doneById = null;
      }
    }

    if (dto.mediaId !== undefined) {
      row.mediaId = dto.mediaId ? await this.assertMedia(groupId, dto.mediaId) : null;
    }

    await this.items.save(row);
    return this.getOne(userId, groupId, no);
  }

  // 칸 비우기 (번호는 그대로 남고 내용만 사라진다)
  async remove(userId: string, groupId: string, no: number) {
    await this.assertMember(userId, groupId);
    this.assertNo(no);
    const row = await this.items.findOne({ where: { groupId, no } });
    if (row) await this.items.remove(row);
    return { no, text: null };
  }

  async getOne(userId: string, groupId: string, no: number) {
    await this.assertMember(userId, groupId);
    this.assertNo(no);
    const row = await this.items.findOne({
      where: { groupId, no },
      relations: { doneBy: { user: true }, media: true },
    });
    if (!row) throw new NotFoundException('아직 비어 있는 칸입니다.');
    return this.toDto(row);
  }

  private toDto(r: BucketItem) {
    return {
      no: r.no,
      text: r.text,
      done: !!r.doneAt,
      doneAt: r.doneAt,
      doneBy: r.doneBy
        ? {
            nickname: r.doneBy.nickname,
            name: r.doneBy.user?.name ?? '',
            photoUrl: r.doneBy.photoUrl ?? null,
          }
        : null,
      mediaId: r.mediaId,
      // 목록에서 작은 썸네일을 보여주려고 대표 사진만 같이 준다
      mediaCoverUrl: r.media?.items?.[0]?.url ?? r.media?.photoUrl ?? null,
    };
  }

  private assertNo(no: number) {
    if (!Number.isInteger(no) || no < 1 || no > BUCKET_SIZE) {
      throw new BadRequestException(`번호는 1~${BUCKET_SIZE} 사이여야 합니다.`);
    }
  }

  // 남의 가족 글을 갖다 붙이지 못하게 같은 가족의 글인지 확인한다
  private async assertMedia(groupId: string, mediaId: string) {
    const m = await this.media.findOne({ where: { id: mediaId } });
    if (!m || m.groupId !== groupId) {
      throw new NotFoundException('연결할 일상 글을 찾을 수 없습니다.');
    }
    return m.id;
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 가족의 구성원이 아닙니다.');
    return m;
  }
}
