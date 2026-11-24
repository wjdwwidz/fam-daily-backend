import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type LlmUsageStatus =
  | 'generated' // LLM 을 불러 새로 만들었다 (토큰·비용 기록)
  | 'skipped' // 기록이 그대로라 부르지 않았다
  | 'empty' // 활동이 없어 부르지 않았다
  | 'limited' // 하루 한도를 넘어 부르지 않았다
  | 'failed' // 불렀지만 실패했다 (이전 요약을 그대로 둔다)
  | 'preview'; // 저장 없이 미리보기로 불렀다 (비용은 든다)

// LLM 호출 기록 — 얼마나 불렀고, 얼마나 아꼈고, 얼마가 들었는지.
// 가족이 지워져도 비용 기록은 남도록 그룹과 외래키로 묶지 않는다.
@Entity()
@Index('IDX_llm_usage_createdAt', ['createdAt'])
export class LlmUsage {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_llm_usage_id' })
  id: string;

  // 어느 기능이 불렀는지 (예: 'monthly-summary')
  @Column({ type: 'varchar', length: 40 })
  feature: string;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ type: 'varchar', length: 12 })
  status: LlmUsageStatus;

  @Column({ type: 'varchar', length: 60, nullable: true })
  model: string | null;

  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  // 달러. 단가는 LLM_INPUT_USD_PER_MTOK / LLM_OUTPUT_USD_PER_MTOK 로 계산한 추정치
  @Column({ type: 'numeric', precision: 10, scale: 6, default: 0 })
  costUsd: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  error: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
