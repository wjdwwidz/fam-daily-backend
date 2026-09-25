import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Event } from '../entities/event.entity';
import { Membership } from '../entities/membership.entity';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

// 가족 일정 — 달력에 적어두는 생일·약속·여행.
// 가족 공용이라 누구나 고치고 지울 수 있다 (버킷리스트와 같은 규칙). 누가 적었는지는 남긴다.
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  // 달력 한 장(한 달)을 그리려고 그 기간에 걸치는 일정을 모두 가져온다.
  // 기간 일정은 시작이 지난달이어도 이번 달에 걸쳐 있으면 보여야 한다.
  async list(userId: string, groupId: string, from?: string, to?: string) {
    await this.assertMember(userId, groupId);
    const where = { groupId };
    const rows = await this.events.find({
      where:
        from && to
          ? [
              // 하루짜리(끝나는 날 없음): 시작일이 기간 안
              { ...where, endDate: IsNull(), startDate: Between(from, to) },
              // 기간짜리: 시작 <= to 이고 끝 >= from (겹치면 보여준다)
              {
                ...where,
                startDate: LessThanOrEqual(to),
                endDate: MoreThanOrEqual(from),
              },
            ]
          : where,
      relations: { createdBy: { user: true } },
      order: { startDate: 'ASC', createdAt: 'ASC' },
      take: 500,
    });
    return rows.map((e) => this.serialize(e));
  }

  async create(userId: string, groupId: string, dto: CreateEventDto) {
    const me = await this.assertMember(userId, groupId);
    const title = (dto.title || '').trim();
    if (!title) throw new BadRequestException('일정 이름을 적어주세요.');
    const saved = await this.events.save(
      this.events.create({
        title,
        ...this.range(dto.startDate, dto.endDate),
        category: dto.category ?? null,
        groupId,
        createdById: me.id,
      }),
    );
    return this.getOne(userId, saved.id);
  }

  async update(userId: string, eventId: string, dto: UpdateEventDto) {
    const row = await this.events.findOne({ where: { id: eventId } });
    if (!row) throw new NotFoundException('일정을 찾을 수 없습니다.');
    await this.assertMember(userId, row.groupId);

    if (dto.title !== undefined) {
      const title = (dto.title || '').trim();
      if (!title) throw new BadRequestException('일정 이름을 적어주세요.');
      row.title = title;
    }
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const range = this.range(
        dto.startDate ?? row.startDate,
        dto.endDate === undefined ? row.endDate : dto.endDate,
      );
      Object.assign(row, range);
    }
    if (dto.category !== undefined) row.category = dto.category ?? null;
    await this.events.save(row);
    return this.getOne(userId, eventId);
  }

  async remove(userId: string, eventId: string) {
    const row = await this.events.findOne({ where: { id: eventId } });
    if (!row) throw new NotFoundException('일정을 찾을 수 없습니다.');
    await this.assertMember(userId, row.groupId);
    await this.events.delete({ id: eventId });
    return { ok: true };
  }

  async getOne(userId: string, eventId: string) {
    const row = await this.events.findOne({
      where: { id: eventId },
      relations: { createdBy: { user: true } },
    });
    if (!row) throw new NotFoundException('일정을 찾을 수 없습니다.');
    await this.assertMember(userId, row.groupId);
    return this.serialize(row);
  }

  // 하루면 endDate 는 비운다. 끝이 시작보다 앞이면 거절 (앱은 그렇게 못 고르게 한다).
  private range(startDate: string, endDate?: string | null) {
    const end = endDate && endDate !== startDate ? endDate : null;
    if (end && end < startDate) {
      throw new BadRequestException('끝나는 날이 시작하는 날보다 앞이에요.');
    }
    return { startDate, endDate: end };
  }

  private serialize(e: Event) {
    return {
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate ?? null,
      category: e.category ?? null,
      createdBy: e.createdBy
        ? {
            userId: e.createdBy.user?.id ?? null,
            nickname: e.createdBy.nickname,
            name: e.createdBy.user?.name ?? '',
            photoUrl: e.createdBy.photoUrl ?? null,
          }
        : null,
    };
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹의 구성원이 아닙니다.');
    return m;
  }
}
