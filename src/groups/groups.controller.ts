import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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

  // 초대 코드 발급 (멤버만 — GroupMemberGuard)
  @Post(':id/invites')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '초대 코드 발급 (멤버만)' })
  createInvite(@Param('id') id: string, @Body() dto: CreateInviteDto) {
    return this.groups.createInvite(id, dto.expiresInDays);
  }
}
