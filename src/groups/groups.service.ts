import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { Role } from '../entities/role.enum';
import { CreateGroupDto, JoinGroupDto, SetMoodDto } from './dto/group.dto';
import { MembershipsService } from './memberships.service';
import { Membership } from '../entities/membership.entity';
import { InvitesService } from './invites.service';
import { StorageService } from '../uploads/storage.service';
import { removeUnusedProfilePhotos } from '../uploads/profile-photos';
import { removeGroupData } from './group-removal';

// 기록 화면이 한 번에 받아가는 줄 수 (한마디 + 프로필 사진 변경)
const HISTORY_LIMIT = 50;
const HISTORY_MAX = 200;

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly memberships: MembershipsService,
    private readonly invites: InvitesService,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
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

    return mems.map((m) => {
      // 탈퇴한 사람의 멤버십은 글에 호칭을 보여주려고 남겨둔 것이다. 구성원으로 세지 않는다.
      const members = m.group.memberships.flatMap((mm) =>
        mm.user
          ? [
              {
                userId: mm.user.id,
                nickname: mm.nickname,
                name: mm.user.name,
                // 가족마다 다른 사진. 없으면 null → 이니셜
                photoUrl: mm.photoUrl,
              },
            ]
          : [],
      );
      return {
        id: m.group.id,
        name: m.group.name,
        myRole: m.role,
        myNickname: m.nickname,
        myPhotoUrl: m.photoUrl,
        memberCount: members.length,
        members: members.slice(0, 5),
      };
    });
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
      // 탈퇴한 사람(user 가 null)은 구성원 목록에서 뺀다
      members: group.memberships.flatMap((m) =>
        m.user
          ? [
              {
                userId: m.user.id,
                name: m.user.name,
                nickname: m.nickname,
                photoUrl: m.photoUrl,
                role: m.role,
                mood: m.mood,
                moodEmoji: m.moodEmoji,
                moodAt: m.moodAt,
              },
            ]
          : [],
      ),
    };
  }

  // 오늘의 한마디(무드) 설정 (멤버 검사는 GroupMemberGuard가 담당) → 갱신된 그룹 상세 반환
  async setMyMood(userId: string, groupId: string, dto: SetMoodDto) {
    await this.memberships.setMood(userId, groupId, dto.text, dto.emoji);
    return this.getOne(groupId);
  }

  // 가족 기록 — 한마디와 프로필 사진 변경을 시간순으로 섞는다.
  // 종류마다 최신 take 개만 가져와 합친 뒤 다시 take 개를 자른다 (최근 활동과 같은 방식).
  async history(userId: string, groupId: string, limit = HISTORY_LIMIT) {
    const take = Math.min(Math.max(1, limit), HISTORY_MAX);
    const { moods, photos } = await this.memberships.listHistory(
      userId,
      groupId,
      take,
    );
    const author = (a: Membership | null) =>
      a
        ? {
            userId: a.user?.id ?? null,
            nickname: a.nickname,
            name: a.user?.name ?? '',
            photoUrl: a.photoUrl ?? null,
          }
        : null;
    const items = [
      ...moods.map((m) => ({
        type: 'mood' as const,
        id: m.id,
        text: m.text,
        emoji: m.emoji,
        photoUrl: null as string | null,
        createdAt: m.createdAt,
        author: author(m.author),
      })),
      ...photos.map((p) => ({
        type: 'photo' as const,
        id: p.id,
        text: '',
        emoji: null as string | null,
        photoUrl: p.photoUrl,
        createdAt: p.createdAt,
        author: author(p.author),
      })),
    ];
    return items
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
  }

  // 그룹(가족) 이름 수정 — 방장(OWNER)만 → 갱신된 그룹 상세 반환
  async renameGroup(userId: string, groupId: string, name: string) {
    const m = await this.memberships.assertMember(userId, groupId);
    if (m.role !== Role.OWNER)
      throw new ForbiddenException('그룹 이름은 방장만 수정할 수 있습니다.');
    await this.groups.update({ id: groupId }, { name });
    return this.getOne(groupId);
  }

  // 가족 공간 삭제 — 방장(OWNER)만.
  // 사진·단어·문답·구성원이 모두 사라지고 되돌릴 수 없다. 구성원 모두에게서 사라진다.
  async deleteGroup(userId: string, groupId: string) {
    const m = await this.memberships.assertMember(userId, groupId);
    if (m.role !== Role.OWNER)
      throw new ForbiddenException('가족 공간은 방장만 삭제할 수 있습니다.');
    const files = await this.dataSource.transaction((tx) =>
      removeGroupData(tx, groupId),
    );
    // DB 삭제가 확정된 뒤에야 파일을 지운다
    for (const url of files.urls) await this.storage.removeByUrl(url);
    for (const path of files.paths) await this.storage.removeByPath(path);
    await removeUnusedProfilePhotos(this.dataSource, this.storage, files.profileUrls);
    return { ok: true };
  }

  // 이 가족에서 쓰는 내 프로필 사진 교체 → 갱신된 그룹 상세 반환.
  // 업로드와 DB 기록을 한 요청으로 묶는다 (나눠 부르면 업로드만 성공했을 때 고아 파일이 남는다).
  async updateMyPhoto(userId: string, groupId: string, file: Express.Multer.File) {
    await this.memberships.assertMember(userId, groupId);
    const url = await this.storage.upload(file, 'profiles');
    let old: string | null;
    try {
      old = await this.memberships.setPhoto(userId, groupId, url);
    } catch (e) {
      // DB 기록 실패 → 방금 올린 파일은 아무도 가리키지 않는다. 되돌린다.
      await this.storage.removeByUrl(url);
      throw e;
    }
    // 새 사진이 확정된 뒤 예전 파일 정리 (다른 가족·계정이 쓰면 남긴다)
    if (old && old !== url) {
      await removeUnusedProfilePhotos(this.dataSource, this.storage, [old]);
    }
    return this.getOne(groupId);
  }

  // 이 가족에서 쓰는 내 사진 지우기 → 이니셜로 보인다
  async removeMyPhoto(userId: string, groupId: string) {
    const old = await this.memberships.setPhoto(userId, groupId, null);
    await removeUnusedProfilePhotos(this.dataSource, this.storage, [old]);
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
