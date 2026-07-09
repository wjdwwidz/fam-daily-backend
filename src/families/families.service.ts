import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Family } from '../entities/family.entity';
import { Membership } from '../entities/membership.entity';
import { Invite } from '../entities/invite.entity';
import { Role } from '../entities/role.enum';
import { CreateFamilyDto, JoinFamilyDto } from './dto/family.dto';

@Injectable()
export class FamiliesService {
  constructor(
    @InjectRepository(Family) private readonly families: Repository<Family>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(Invite) private readonly invites: Repository<Invite>,
  ) {}

  // 가족 공간 생성 → 생성자는 OWNER 멤버십
  async create(userId: string, dto: CreateFamilyDto) {
    const family = await this.families.save(
      this.families.create({ name: dto.name }),
    );
    await this.memberships.save(
      this.memberships.create({
        nickname: dto.nickname,
        role: Role.OWNER,
        user: { id: userId } as any,
        family: { id: family.id } as any,
      }),
    );
    return { id: family.id, name: family.name, myRole: Role.OWNER, memberCount: 1 };
  }

  // 내가 속한 가족 목록 (가족 선택 화면)
  async listMine(userId: string) {
    const mems = await this.memberships.find({
      where: { user: { id: userId } },
      relations: { family: { memberships: { user: true } } },
      order: { createdAt: 'ASC' },
    });

    return mems.map((m) => ({
      id: m.family.id,
      name: m.family.name,
      myRole: m.role,
      myNickname: m.nickname,
      memberCount: m.family.memberships.length,
      members: m.family.memberships.slice(0, 5).map((mm) => ({
        nickname: mm.nickname,
        name: mm.user.name,
      })),
    }));
  }

  // 가족 상세 + 구성원 (멤버만 접근)
  async getOne(userId: string, familyId: string) {
    await this.assertMember(userId, familyId);
    const family = await this.families.findOne({
      where: { id: familyId },
      relations: { memberships: { user: true } },
      order: { memberships: { createdAt: 'ASC' } },
    });
    if (!family) throw new NotFoundException('가족 공간을 찾을 수 없습니다.');
    return {
      id: family.id,
      name: family.name,
      members: family.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        nickname: m.nickname,
        role: m.role,
      })),
    };
  }

  // 초대 코드 생성 (멤버만)
  async createInvite(userId: string, familyId: string, expiresInDays?: string) {
    await this.assertMember(userId, familyId);
    const code = randomBytes(6).toString('base64url'); // 8자 정도의 URL-safe 코드
    const days = expiresInDays ? Number(expiresInDays) : null;
    const expiresAt =
      days && !Number.isNaN(days)
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

    const invite = await this.invites.save(
      this.invites.create({ code, family: { id: familyId } as any, expiresAt }),
    );
    return {
      code: invite.code,
      link: `우리끼리.app/join/${invite.code}`,
      expiresAt: invite.expiresAt,
    };
  }

  // 초대 코드로 참여
  async join(userId: string, dto: JoinFamilyDto) {
    const invite = await this.invites.findOne({
      where: { code: dto.code },
      relations: { family: true },
    });
    if (!invite) throw new NotFoundException('유효하지 않은 초대 코드입니다.');
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new ForbiddenException('만료된 초대 코드입니다.');

    const existing = await this.memberships.findOne({
      where: { user: { id: userId }, family: { id: invite.family.id } },
    });
    if (existing) throw new ForbiddenException('이미 참여 중인 가족입니다.');

    await this.memberships.save(
      this.memberships.create({
        nickname: dto.nickname,
        role: Role.MEMBER,
        user: { id: userId } as any,
        family: { id: invite.family.id } as any,
      }),
    );
    return this.getOne(userId, invite.family.id);
  }

  private async assertMember(userId: string, familyId: string) {
    const m = await this.memberships.findOne({
      where: { user: { id: userId }, family: { id: familyId } },
    });
    if (!m) throw new ForbiddenException('이 가족 공간의 구성원이 아닙니다.');
    return m;
  }
}
