import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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

  // 가족 공간 삭제 (방장만 — 멤버 가드 + 서비스에서 OWNER 검사)
  @Delete(':id')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '가족 공간 삭제 (방장만). 사진·단어·문답 모두 삭제' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.deleteGroup(user.id, id);
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

  @Get(':id/history')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({
    summary: '가족 기록 — 한마디·프로필 사진 변경을 최신순으로 (멤버만)',
  })
  history(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.groups.history(user.id, id, Number(limit) || undefined);
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

  // 이 가족에서 쓰는 내 프로필 사진 교체 (멤버만). 업로드+저장을 한 번에.
  @Post(':id/me/photo')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '이 가족에서 쓰는 내 사진 교체 (multipart, field=file)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB 제한 (계정 사진과 같음)
      fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
    }),
  )
  updateMyPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('이미지 파일이 없습니다.');
    return this.groups.updateMyPhoto(user.id, id, file);
  }

  // 이 가족에서 쓰는 내 사진 지우기 → 이니셜로 보인다 (멤버만)
  @Delete(':id/me/photo')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '이 가족에서 쓰는 내 사진 지우기' })
  removeMyPhoto(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.removeMyPhoto(user.id, id);
  }

  // 초대 코드 발급 (멤버만 — GroupMemberGuard)
  @Post(':id/invites')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: '초대 코드 발급 (멤버만)' })
  createInvite(@Param('id') id: string, @Body() dto: CreateInviteDto) {
    return this.groups.createInvite(id, dto.expiresInDays);
  }
}
