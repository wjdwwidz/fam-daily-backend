import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { GroupMemberGuard } from './group-member.guard';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  CreateInviteDto,
  JoinGroupDto,
  RenameGroupDto,
  SetMoodDto,
  UpdateNicknameDto,
} from './dto/group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  // 내 그룹 목록 (그룹 선택 화면)
  @Get()
  @ApiOperation({ summary: '내 그룹 목록' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.groups.listMine(user.id);
  }

  // 그룹 공간 만들기
  @Post()
  @ApiOperation({ summary: '그룹 공간 만들기' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto);
  }

  // 초대 코드로 참여
  @Post('join')
  @ApiOperation({ summary: '초대 코드로 그룹 참여' })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinGroupDto) {
    return this.groups.join(user.id, dto);
  }

  // 그룹 상세 + 구성원 (멤버만 — GroupMemberGuard)
  @Get(':id')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '그룹 상세 + 구성원 (멤버만)' })
  getOne(@Param('id') id: string) {
    return this.groups.getOne(id);
  }

  // 그룹 이름 수정 (방장만 — 멤버 가드 + 서비스에서 OWNER 검사)
  @Patch(':id')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '그룹 이름 수정 (방장만)' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RenameGroupDto,
  ) {
    return this.groups.renameGroup(user.id, id, dto.name);
  }

  // 오늘의 한마디(무드) 설정 (멤버만 — GroupMemberGuard)
  @Put(':id/mood')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '오늘의 한마디 설정 (멤버만)' })
  setMood(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetMoodDto,
  ) {
    return this.groups.setMyMood(user.id, id, dto);
  }

  // 내 호칭 수정 (멤버만 — GroupMemberGuard)
  @Patch(':id/me')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '내 호칭 수정 (멤버만)' })
  updateMyNickname(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNicknameDto,
  ) {
    return this.groups.updateMyNickname(user.id, id, dto.nickname);
  }

  // 초대 코드 발급 (멤버만 — GroupMemberGuard)
  @Post(':id/invites')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '초대 코드 발급 (멤버만)' })
  createInvite(@Param('id') id: string, @Body() dto: CreateInviteDto) {
    return this.groups.createInvite(id, dto.expiresInDays);
  }
}
