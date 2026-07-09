import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto, JoinFamilyDto } from './dto/family.dto';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  // 가족 공간 생성 → 생성자는 OWNER 멤버십
  async create(userId: string, dto: CreateFamilyDto) {
    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        memberships: {
          create: { userId, nickname: dto.nickname, role: Role.OWNER },
        },
      },
      include: { _count: { select: { memberships: true } } },
    });
    return this.serialize(family, Role.OWNER);
  }

  // 내가 속한 가족 목록 (SpaceSelect 화면용)
  async listMine(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        family: {
          include: {
            _count: { select: { memberships: true } },
            memberships: {
              take: 5,
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.family.id,
      name: m.family.name,
      myRole: m.role,
      myNickname: m.nickname,
      memberCount: m.family._count.memberships,
      members: m.family.memberships.map((mm) => ({
        nickname: mm.nickname,
        name: mm.user.name,
      })),
    }));
  }

  // 가족 상세 + 구성원 (멤버만 접근)
  async getOne(userId: string, familyId: string) {
    await this.assertMember(userId, familyId);
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!family) throw new NotFoundException('가족 공간을 찾을 수 없습니다.');
    return {
      id: family.id,
      name: family.name,
      members: family.memberships.map((m) => ({
        userId: m.userId,
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

    const invite = await this.prisma.invite.create({
      data: { code, familyId, expiresAt },
    });
    return {
      code: invite.code,
      link: `우리끼리.app/join/${invite.code}`,
      expiresAt: invite.expiresAt,
    };
  }

  // 초대 코드로 참여
  async join(userId: string, dto: JoinFamilyDto) {
    const invite = await this.prisma.invite.findUnique({
      where: { code: dto.code },
      include: { family: true },
    });
    if (!invite) throw new NotFoundException('유효하지 않은 초대 코드입니다.');
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new ForbiddenException('만료된 초대 코드입니다.');

    const existing = await this.prisma.membership.findUnique({
      where: { userId_familyId: { userId, familyId: invite.familyId } },
    });
    if (existing) throw new ForbiddenException('이미 참여 중인 가족입니다.');

    await this.prisma.membership.create({
      data: {
        userId,
        familyId: invite.familyId,
        nickname: dto.nickname,
        role: Role.MEMBER,
      },
    });
    return this.getOne(userId, invite.familyId);
  }

  private async assertMember(userId: string, familyId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });
    if (!m) throw new ForbiddenException('이 가족 공간의 구성원이 아닙니다.');
    return m;
  }

  private serialize(
    family: { id: string; name: string; _count: { memberships: number } },
    myRole: Role,
  ) {
    return {
      id: family.id,
      name: family.name,
      myRole,
      memberCount: family._count.memberships,
    };
  }
}
