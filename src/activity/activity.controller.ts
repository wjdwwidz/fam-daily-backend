import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ActivityService, DEFAULT_ACTIVITY_LIMIT } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('groups/:groupId/activity')
  @ApiOperation({ summary: '가족 최근 활동 (사전 추가·일상·질문·답변, 최신순)' })
  @ApiQuery({ name: 'limit', required: false, example: DEFAULT_ACTIVITY_LIMIT })
  recent(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Number(limit);
    return this.activity.recent(
      user.id,
      groupId,
      Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_ACTIVITY_LIMIT,
    );
  }
}
