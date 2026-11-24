import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { Group } from '../entities/group.entity';
import { LlmUsage } from '../entities/llm-usage.entity';
import { Membership } from '../entities/membership.entity';
import { MonthlySummary } from '../entities/monthly-summary.entity';
import { LlmService } from './llm.service';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

// 홈 '이번 달 우리 가족' 요약 — 활동 기록을 읽어 LLM 으로 요약하고, 호출 기록(비용)을 남긴다
@Module({
  imports: [
    ActivityModule,
    TypeOrmModule.forFeature([MonthlySummary, LlmUsage, Group, Membership]),
  ],
  controllers: [SummaryController],
  providers: [SummaryService, LlmService],
})
export class SummaryModule {}
