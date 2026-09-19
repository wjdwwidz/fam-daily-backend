import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { MoodLog } from '../entities/mood-log.entity';
import { ProfileLog } from '../entities/profile-log.entity';
import { Role } from '../entities/role.enum';

// 멤버십(유저↔그룹) 관련 로직 — 다른 기능에서도 재사용되는 멤버 검사/생성/조회
@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(MoodLog)
    private readonly moodLogs: Repository<MoodLog>,
    @InjectRepository(ProfileLog)
    private readonly profileLogs: Repository<ProfileLog>,
  ) {}

  // 멤버 여부 확인 (아니면 예외) — 그룹 스코프 기능들의 공통 가드
  async assertMember(userId: string, groupId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    if (!m) throw new ForbiddenException('이 그룹 공간의 구성원이 아닙니다.');
    return m;
  }

  // 이미 참여 중인지
  async exists(userId: string, groupId: string) {
    return this.memberships.existsBy({
      user: { id: userId },
      group: { id: groupId },
    });
  }

  // 멤버십 생성
  async add(params: {
    userId: string;
    groupId: string;
    nickname: string;
    role: Role;
  }) {
    return this.memberships.save(
      this.memberships.create({
        nickname: params.nickname,
        role: params.role,
        user: { id: params.userId } as any,
        group: { id: params.groupId } as any,
      }),
    );
  }

  // 내 호칭 수정 (그룹 멤버여야 함)
  async updateNickname(userId: string, groupId: string, nickname: string) {
    const m = await this.assertMember(userId, groupId);
    m.nickname = nickname;
    return this.memberships.save(m);
  }

  // 이 가족에서 쓰는 내 사진 바꾸기 (null = 지우기) → 예전 사진 주소를 돌려준다
  async setPhoto(userId: string, groupId: string, photoUrl: string | null) {
    const m = await this.assertMember(userId, groupId);
    const old = m.photoUrl;
    if (old === photoUrl) return old; // 같은 사진이면 기록도 남기지 않는다
    m.photoUrl = photoUrl;
    await this.memberships.save(m);
    // 바꾼 순간을 기록에 남긴다 (한마디와 같은 화면에서 함께 본다)
    await this.profileLogs.save(
      this.profileLogs.create({ photoUrl, groupId, authorId: m.id }),
    );
    return old;
  }

  // 오늘의 한마디(무드) 설정 (그룹 멤버여야 함)
  // 한마디는 '지금 상태'라 덮어쓴다. 지난 것을 볼 수 있게 남긴 순간을 mood_log 에 한 줄 쌓는다.
  // 기록이 실패해도 한마디 자체는 남아야 하므로 한 트랜잭션으로 묶지 않는다.
  async setMood(userId: string, groupId: string, text: string, emoji?: string) {
    const m = await this.assertMember(userId, groupId);
    m.mood = text;
    m.moodEmoji = emoji ?? null;
    m.moodAt = new Date();
    const saved = await this.memberships.save(m);
    const body = (text || '').trim();
    if (body) {
      await this.moodLogs.save(
        this.moodLogs.create({
          text: body,
          emoji: emoji ?? null,
          groupId,
          authorId: m.id,
        }),
      );
    }
    return saved;
  }

  // 가족의 기록 — 한마디와 프로필 사진 변경을 각각 최신순으로.
  // 탈퇴한 사람의 줄도 호칭과 함께 남는다.
  async listHistory(userId: string, groupId: string, limit: number) {
    await this.assertMember(userId, groupId);
    const opts = {
      where: { groupId },
      relations: { author: { user: true } },
      order: { createdAt: 'DESC' as const },
      take: limit,
    };
    const [moods, photos] = await Promise.all([
      this.moodLogs.find(opts),
      this.profileLogs.find(opts),
    ]);
    return { moods, photos };
  }

  // 내가 속한 그룹 목록용 — 멤버십 + 그룹(+구성원) 로드
  async listForUser(userId: string) {
    return this.memberships.find({
      where: { user: { id: userId } },
      relations: { group: { memberships: { user: true } } },
      // 가족 구성원도 가입순으로 정렬한다. 홈 무드 링은 배열 순서대로 자리를 잡는데,
      // 상세(getGroup)는 가입순이고 여기만 정렬이 없으면 상세가 도착하는 순간
      // 프로필 자리가 바뀐다.
      order: { createdAt: 'ASC', group: { memberships: { createdAt: 'ASC' } } },
    });
  }
}
