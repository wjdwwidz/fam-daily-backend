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
              {
                ...where,
                repeatYearly: false,
                endDate: IsNull(),
                startDate: Between(from, to),
              },
              // 기간짜리: 시작 <= to 이고 끝 >= from (겹치면 보여준다)
              {
                ...where,
                repeatYearly: false,
                startDate: LessThanOrEqual(to),
                endDate: MoreThanOrEqual(from),
              },
            ]
          : where,
      relations: { createdBy: { user: true } },
      order: { startDate: 'ASC', createdAt: 'ASC' },
      take: 500,
    });
    const out = rows.map((e) => this.serialize(e));
    if (!from || !to) return out;

    // 매년 반복하는 일정은 저장된 해가 언제든 보고 있는 달로 옮겨서 보여준다.
    // (달력 한 장은 한 달이지만 연말·연초를 걸칠 수 있어 앞뒤 해도 같이 본다)
    const repeats = await this.events.find({
      where: { groupId, repeatYearly: true },
      relations: { createdBy: { user: true } },
      take: 200,
    });
    const years = [
      ...new Set([Number(from.slice(0, 4)) - 1, Number(to.slice(0, 4))]),
    ];
    for (const e of repeats) {
      for (const y of years) {
        const o = this.yearly(e, y);
        // 처음 적은 해보다 전에는 아직 없던 일정이다
        if (o.startDate < e.startDate) continue;
        if (o.startDate > to || (o.endDate ?? o.startDate) < from) continue;
        out.push(this.serialize(e, o));
      }
    }
    out.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    return out;
  }

  // 홈에 띄울 것 — D-day 로 켠 일정 중 아직 안 지난 것만, 가까운 순으로.
  // 기간 일정은 끝나는 날까지 '진행 중' 이라 남겨둔다.
  async upcomingDday(userId: string, groupId: string, limit = 3) {
    await this.assertMember(userId, groupId);
    // 한국 시간 기준 오늘 (서버가 UTC 라 그대로 쓰면 자정 무렵에 하루가 어긋난다)
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rows = await this.events
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.createdBy', 'createdBy')
      .leftJoin('createdBy.user', 'createdByUser')
      .addSelect(['createdByUser.id', 'createdByUser.name'])
      .where('e.groupId = :groupId', { groupId })
      .andWhere('e.isDday = true')
      .take(100)
      .getMany();

    // 매년 반복하는 일정은 다음 차례까지 센다 (지난 생일이 아니라 올해·내년 생일).
    const items = rows.map((e) => ({
      e,
      o: e.repeatYearly
        ? this.nextYearly(e, today)
        : { startDate: e.startDate, endDate: e.endDate },
    }));
    const done = (x: (typeof items)[number]) =>
      (x.o.endDate ?? x.o.startDate) < today;
    // 아직 안 지난 것부터 가까운 순, 그다음 지난 것(날짜수·주수)은 최근 순.
    // 남은 날(dday)은 지나면 홈에서 빠진다.
    const upcoming = items
      .filter((x) => !done(x))
      .sort((a, b) => (a.o.startDate < b.o.startDate ? -1 : 1));
    const past = items
      .filter((x) => done(x) && x.e.ddayMode !== 'dday')
      .sort((a, b) => (a.o.startDate > b.o.startDate ? -1 : 1));
    return [...upcoming, ...past]
      .slice(0, Math.min(Math.max(1, limit), 10))
      .map((x) => this.serialize(x.e, x.o));
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
        repeatYearly: dto.repeatYearly ?? false,
        isDday: dto.isDday ?? false,
        ddayMode: dto.ddayMode ?? 'dday',
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
    if (dto.repeatYearly !== undefined) row.repeatYearly = dto.repeatYearly;
    if (dto.isDday !== undefined) row.isDday = dto.isDday;
    if (dto.ddayMode !== undefined) row.ddayMode = dto.ddayMode;
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

  // 매년 반복 일정이 그 해에 오는 날. 2월 29일은 평년이면 28일로 당긴다.
  // 며칠짜리면 길이를 그대로 유지한다.
  private yearly(e: Event, year: number) {
    const [, mm, dd] = e.startDate.split('-');
    const last = new Date(Date.UTC(year, Number(mm), 0)).getUTCDate();
    const day = Math.min(Number(dd), last);
    const startDate = `${year}-${mm}-${String(day).padStart(2, '0')}`;
    const span = e.endDate ? this.daysBetween(e.startDate, e.endDate) : 0;
    return {
      startDate,
      endDate: span > 0 ? this.addDays(startDate, span) : null,
    };
  }

  // 오늘 이후로 가장 가까운 차례 (올해 것이 지났으면 내년 것)
  private nextYearly(e: Event, today: string) {
    const year = Number(today.slice(0, 4));
    const thisYear = this.yearly(e, year);
    if ((thisYear.endDate ?? thisYear.startDate) >= today) return thisYear;
    return this.yearly(e, year + 1);
  }

  private daysBetween(a: string, b: string) {
    return Math.round(
      (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
    );
  }

  private addDays(ymd: string, n: number) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // over: 반복 일정을 그 해(또는 다음 차례) 날짜로 바꿔서 내보낼 때 쓴다.
  private serialize(
    e: Event,
    over?: { startDate: string; endDate: string | null },
  ) {
    return {
      id: e.id,
      title: e.title,
      startDate: over?.startDate ?? e.startDate,
      endDate: (over ? over.endDate : e.endDate) ?? null,
      category: e.category ?? null,
      repeatYearly: e.repeatYearly ?? false,
      isDday: e.isDday ?? false,
      // 해마다 돌아오는 일정은 '지난 날수' 로 셀 수 없다 — 늘 다음 차례까지 남은 날.
      ddayMode: e.repeatYearly ? 'dday' : (e.ddayMode ?? 'dday'),
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
