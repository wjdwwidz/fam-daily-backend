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

// 버킷리스트는 10칸이 한 장(page)이다. 한 장을 다 채우면 다음 장이 열린다.
// 빈 칸은 행이 없고, 화면이 번호를 그린다.
export const BUCKET_SIZE = 10;
// 무한히 열리지는 않게 상한을 둔다 (잘못된 번호를 막기 위한 것)
const MAX_PAGES = 100;

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
      relations: { createdBy: { user: true }, doneBy: { user: true }, media: true },
      order: { no: 'ASC' },
    });
    const pages = this.unlockedPages(rows.map((r) => r.no));
    return {
      size: BUCKET_SIZE,
      pages,
      doneCount: rows.filter((r) => r.doneAt).length,
      items: rows.map((r) => this.toDto(r)),
    };
  }

  // 1장은 늘 열려 있고, 앞 장을 빈칸 없이 다 채웠을 때만 다음 장이 열린다.
  // (달성 여부가 아니라 '채웠는지' 기준 — 달성은 천천히 해도 다음 장을 쓸 수 있게)
  //
  // 이미 적어둔 칸이 있으면 그 칸이 있는 장까지는 늘 열어둔다. 한 장 크기를 바꿔도
  // 앞 장이 덜 찼다는 이유로 기존 칸이 손댈 수 없게 되면 안 된다.
  private unlockedPages(nos: number[]) {
    const filled = new Set(nos);
    const reach = nos.length
      ? Math.ceil(Math.max(...nos) / BUCKET_SIZE)
      : 1;
    let pages = 1;
    while (pages < MAX_PAGES) {
      const start = (pages - 1) * BUCKET_SIZE + 1;
      const end = pages * BUCKET_SIZE;
      let full = true;
      for (let n = start; n <= end; n++) {
        if (!filled.has(n)) {
          full = false;
          break;
        }
      }
      if (!full) break;
      pages++;
    }
    return Math.max(pages, reach);
  }

  // 한 칸 쓰기/고치기. 같은 번호가 있으면 덮어쓴다.
  async save(userId: string, groupId: string, no: number, dto: SaveBucketDto) {
    const me = await this.assertMember(userId, groupId);
    await this.assertNo(groupId, no);

    let row = await this.items.findOne({ where: { groupId, no } });
    // 처음 적은 사람만 남긴다 — 나중에 남이 고쳐도 '누가 하고 싶다고 했는지'는 그대로
    if (!row) row = this.items.create({ groupId, no, createdById: me.id });
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

  // 칸을 다른 번호로 옮긴다 (우선순위 조정).
  // 사이에 있던 칸들은 한 칸씩 밀린다 — 목록에서 끌어다 놓는 것과 같은 결과.
  async move(userId: string, groupId: string, from: number, to: number) {
    await this.assertMember(userId, groupId);
    await this.assertNo(groupId, from);
    await this.assertNo(groupId, to);
    if (from === to) return this.list(userId, groupId);

    const row = await this.items.findOne({ where: { groupId, no: from } });
    if (!row) throw new NotFoundException('옮길 칸이 비어 있습니다.');

    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const shift = to > from ? -1 : 1;

    // 번호는 (가족, 번호)로 유일해서 한 칸씩 옮기면 중간에 부딪힌다.
    // 영향 구간을 한 번에 큰 수로 치워둔 뒤 제자리로 되돌린다.
    const PARK = 1_000_000;
    await this.items.manager.transaction(async (m) => {
      await m.query(
        `UPDATE "bucket_item" SET "no" = "no" + $1
         WHERE "groupId" = $2 AND "no" BETWEEN $3 AND $4`,
        [PARK, groupId, lo, hi],
      );
      await m.query(
        `UPDATE "bucket_item" SET "no" = $1 WHERE "groupId" = $2 AND "no" = $3`,
        [to, groupId, from + PARK],
      );
      await m.query(
        `UPDATE "bucket_item" SET "no" = "no" - $1 + $2
         WHERE "groupId" = $3 AND "no" > $1`,
        [PARK, shift, groupId],
      );
    });
    return this.list(userId, groupId);
  }

  // 칸 비우기 (번호는 그대로 남고 내용만 사라진다)
  async remove(userId: string, groupId: string, no: number) {
    await this.assertMember(userId, groupId);
    await this.assertNo(groupId, no);
    const row = await this.items.findOne({ where: { groupId, no } });
    if (row) await this.items.remove(row);
    return { no, text: null };
  }

  async getOne(userId: string, groupId: string, no: number) {
    await this.assertMember(userId, groupId);
    await this.assertNo(groupId, no);
    const row = await this.items.findOne({
      where: { groupId, no },
      relations: { createdBy: { user: true }, doneBy: { user: true }, media: true },
    });
    if (!row) throw new NotFoundException('아직 비어 있는 칸입니다.');
    return this.toDto(row);
  }

  private toDto(r: BucketItem) {
    return {
      no: r.no,
      text: r.text,
      createdBy: r.createdBy
        ? {
            nickname: r.createdBy.nickname,
            name: r.createdBy.user?.name ?? '',
            photoUrl: r.createdBy.photoUrl ?? null,
          }
        : null,
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

  // 아직 열리지 않은 장의 번호는 막는다 — 1장을 비워둔 채 200번을 쓰지 못하게.
  private async assertNo(groupId: string, no: number) {
    if (!Number.isInteger(no) || no < 1) {
      throw new BadRequestException('번호가 올바르지 않습니다.');
    }
    const nos = await this.items.find({ where: { groupId }, select: { no: true } });
    const limit = this.unlockedPages(nos.map((r) => r.no)) * BUCKET_SIZE;
    if (no > limit) {
      throw new BadRequestException(
        `${limit}번까지 쓸 수 있어요. 앞의 칸을 모두 채우면 다음 ${BUCKET_SIZE}개가 열립니다.`,
      );
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
