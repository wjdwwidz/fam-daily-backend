import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { FamiliesService } from './families.service';
import {
  CreateFamilyDto,
  CreateInviteDto,
  JoinFamilyDto,
} from './dto/family.dto';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(private readonly families: FamiliesService) {}

  // 내 가족 목록 (가족 선택 화면)
  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.families.listMine(user.id);
  }

  // 가족 공간 만들기
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyDto) {
    return this.families.create(user.id, dto);
  }

  // 초대 코드로 참여
  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinFamilyDto) {
    return this.families.join(user.id, dto);
  }

  // 가족 상세 + 구성원
  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.families.getOne(user.id, id);
  }

  // 초대 코드 발급
  @Post(':id/invites')
  createInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.families.createInvite(user.id, id, dto.expiresInDays);
  }
}
