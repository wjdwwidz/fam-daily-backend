import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';

// 가족의 한 달 요약 (홈 화면 카드). 가족·달마다 한 줄만 두고 새로 만들 때 덮어쓴다.
// fingerprint 는 요약에 쓴 활동 기록의 지문 — 기록이 그대로면 LLM 을 다시 부르지 않는다.
@Entity()
@Unique('UQ_monthly_summary_group_month', ['groupId', 'month'])
export class MonthlySummary {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_monthly_summary_id' })
  id: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId', foreignKeyConstraintName: 'FK_monthly_summary_group' })
  group: Group;

  @Column()
  groupId: string;

  // 한국 시간 기준 'YYYY-MM'
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'text' })
  text: string;

  // 요약에 쓴 활동 수. 0 이면 LLM 없이 정해진 문구를 둔다
  @Column({ type: 'int', default: 0 })
  activityCount: number;

  @Column({ type: 'varchar', length: 64 })
  fingerprint: string;

  // 요약을 만든 모델. 활동이 없어 LLM 을 부르지 않았으면 비어 있다
  @Column({ type: 'varchar', length: 60, nullable: true })
  model: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
