import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { SummaryService, monthOf, previousMonth } from './summary.service';

@ApiTags('summary')
@Controller()
export class SummaryController {
  constructor(
    private readonly summary: SummaryService,
    private readonly config: ConfigService,
  ) {}

  @Get('groups/:groupId/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '지난달 가족 요약 (없으면 summary: null). 진행 중인 이번 달은 보여주지 않는다' })
  get(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.summary.get(user.id, groupId);
  }

  @Get('groups/:groupId/summaries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '지난 월간 요약 목록 (끝난 달 중 활동이 있던 달만, 최근 달부터)' })
  history(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.summary.history(user.id, groupId);
  }

  // 새벽 배치를 기다리지 않고 바로 만들어 볼 때 (그리고 Railway 가 잠들어 크론이 안 돌았을 때).
  // 업로드 청소와 같은 관리 토큰을 쓴다. 토큰이 설정 안 돼 있으면 항상 거부.
  @Post('admin/summaries/run')
  @ApiTags('admin')
  @ApiOperation({ summary: '[관리] 월간 요약 만들기 (헤더 x-sweep-token, body.month 없으면 지난달, body.groupId 없으면 전체, body.dryRun=true 면 저장 없이 미리보기)' })
  async run(
    @Headers('x-sweep-token') token?: string,
    @Body() body?: { groupId?: string; month?: string; dryRun?: boolean },
  ) {
    const expected = this.config.get<string>('ADMIN_SWEEP_TOKEN');
    if (!expected || token !== expected) throw new UnauthorizedException();
    // 기본은 지난달 (홈에 보이는 달). 테스트로 다른 달을 만들 땐 body.month
    const month = /^\d{4}-\d{2}$/.test(body?.month ?? '') ? body!.month! : previousMonth(monthOf(new Date()));
    // dryRun: 저장하지 않고 프롬프트와 결과만 본다
    if (body?.dryRun) {
      const ids = body.groupId ? [body.groupId] : (await this.summary.listGroups()).map((g) => g.id);
      const out: unknown[] = [];
      for (const id of ids) out.push(await this.summary.preview(id, month));
      return out;
    }
    if (body?.groupId) {
      return [await this.summary.refresh(body.groupId, month)];
    }
    return this.summary.refreshAll();
  }
}
