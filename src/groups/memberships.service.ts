import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../entities/membership.entity';
import { Role } from '../entities/role.enum';

// 멤버십(유저↔그룹) 관련 로직 — 다른 기능에서도 재사용되는 멤버 검사/생성/조회
@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
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

  // 내가 속한 그룹 목록용 — 멤버십 + 그룹(+구성원) 로드
  async listForUser(userId: string) {
    return this.memberships.find({
      where: { user: { id: userId } },
      relations: { group: { memberships: { user: true } } },
      order: { createdAt: 'ASC' },
    });
  }
}
