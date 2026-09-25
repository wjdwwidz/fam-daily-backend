import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('groups/:groupId/events')
  @ApiOperation({
    summary:
      '가족 일정 — from~to 에 걸치는 것 (기간 일정은 걸쳐만 있어도 나온다)',
  })
  @ApiQuery({ name: 'from', required: false, example: '2026-10-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-10-31' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.events.list(user.id, groupId, from, to);
  }

  @Get('groups/:groupId/events/dday')
  @ApiOperation({
    summary: '홈에 띄울 D-day 일정 — 아직 안 지난 것만 가까운 순',
  })
  @ApiQuery({ name: 'limit', required: false, example: 3 })
  dday(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Number(limit);
    return this.events.upcomingDday(
      user.id,
      groupId,
      Number.isFinite(n) && n > 0 ? Math.floor(n) : 3,
    );
  }

  @Post('groups/:groupId/events')
  @ApiOperation({ summary: '일정 추가 (가족 누구나)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.events.create(user.id, groupId, dto);
  }

  @Patch('events/:eventId')
  @ApiOperation({ summary: '일정 수정 (가족 누구나 — 가족 공용이라)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(user.id, eventId, dto);
  }

  @Delete('events/:eventId')
  @ApiOperation({ summary: '일정 삭제 (가족 누구나)' })
  remove(@CurrentUser() user: AuthUser, @Param('eventId') eventId: string) {
    return this.events.remove(user.id, eventId);
  }
}
