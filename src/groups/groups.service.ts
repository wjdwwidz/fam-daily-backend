import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { Role } from '../entities/role.enum';
import { CreateGroupDto, JoinGroupDto, SetMoodDto } from './dto/group.dto';
import { MembershipsService } from './memberships.service';
import { InvitesService } from './invites.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly memberships: MembershipsService,
    private readonly invites: InvitesService,
  ) {}

  // 그룹 공간 생성 → 생성자는 OWNER 멤버십
  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.groups.save(
      this.groups.create({ name: dto.name }),
    );
    await this.memberships.add({
      userId,
      groupId: group.id,
      nickname: dto.nickname,
      role: Role.OWNER,
    });
    return { id: group.id, name: group.name, myRole: Role.OWNER, memberCount: 1 };
  }

  // 내가 속한 그룹 목록 (그룹 선택 화면)
  async listMine(userId: string) {
    const mems = await this.memberships.listForUser(userId);

    return mems.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      myRole: m.role,
      myNickname: m.nickname,
      memberCount: m.group.memberships.length,
      members: m.group.memberships.slice(0, 5).map((mm) => ({
        nickname: mm.nickname,
        name: mm.user.name,
      })),
    }));
  }

  // 그룹 상세 + 구성원 (멤버 검사는 GroupMemberGuard가 담당)
  async getOne(groupId: string) {
    const group = await this.groups.findOne({
      where: { id: groupId },
      relations: { memberships: { user: true } },
      order: { memberships: { createdAt: 'ASC' } },
    });
    if (!group) throw new NotFoundException('그룹 공간을 찾을 수 없습니다.');
    return {
      id: group.id,
      name: group.name,
      members: group.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        nickname: m.nickname,
        role: m.role,
        mood: m.mood,
        moodEmoji: m.moodEmoji,
        moodAt: m.moodAt,
      })),
    };
  }

  // 오늘의 한마디(무드) 설정 (멤버 검사는 GroupMemberGuard가 담당) → 갱신된 그룹 상세 반환
  async setMyMood(userId: string, groupId: string, dto: SetMoodDto) {
    await this.memberships.setMood(userId, groupId, dto.text, dto.emoji);
    return this.getOne(groupId);
  }

  // 그룹(가족) 이름 수정 — 방장(OWNER)만 → 갱신된 그룹 상세 반환
  async renameGroup(userId: string, groupId: string, name: string) {
    const m = await this.memberships.assertMember(userId, groupId);
    if (m.role !== Role.OWNER)
      throw new ForbiddenException('그룹 이름은 방장만 수정할 수 있습니다.');
    await this.groups.update({ id: groupId }, { name });
    return this.getOne(groupId);
  }

  // 내 호칭 수정 (멤버 검사는 GroupMemberGuard가 담당) → 갱신된 그룹 상세 반환
  async updateMyNickname(userId: string, groupId: string, nickname: string) {
    await this.memberships.updateNickname(userId, groupId, nickname);
    return this.getOne(groupId);
  }

  // 초대 코드 생성 (멤버 검사는 GroupMemberGuard가 담당)
  async createInvite(groupId: string, expiresInDays?: string) {
    return this.invites.create(groupId, expiresInDays);
  }

  // 초대 코드로 참여 (초대 검증 + 멤버십 생성 오케스트레이션)
  async join(userId: string, dto: JoinGroupDto) {
    const invite = await this.invites.getValidByCode(dto.code);

    if (await this.memberships.exists(userId, invite.group.id))
      throw new ForbiddenException('이미 참여 중인 그룹입니다.');

    await this.memberships.add({
      userId,
      groupId: invite.group.id,
      nickname: dto.nickname,
      role: Role.MEMBER,
    });
    return this.getOne(invite.group.id);
  }
}
