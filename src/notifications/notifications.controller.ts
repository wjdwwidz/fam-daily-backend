import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import {
  DEFAULT_NOTIFICATION_LIMIT,
  NotificationsService,
} from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('groups/:groupId/notifications')
  @ApiOperation({
    summary: '내 알림 — 내 글의 댓글·내 댓글의 답글 (최신순, 안 읽은 수 포함)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: DEFAULT_NOTIFICATION_LIMIT,
  })
  list(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Number(limit);
    return this.notifications.list(
      user.id,
      groupId,
      Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_NOTIFICATION_LIMIT,
    );
  }

  @Post('groups/:groupId/notifications/seen')
  @ApiOperation({ summary: '알림을 읽음으로 (알림 화면을 열 때)' })
  markSeen(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.notifications.markSeen(user.id, groupId);
  }
}
