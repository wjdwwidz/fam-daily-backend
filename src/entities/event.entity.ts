import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';

// 가족 일정 — 생일·약속·여행처럼 달력에 적어두는 것.
// 하루면 startDate 만, 며칠이면 endDate 까지. 시각 없는 날짜(date)라 시간대로 하루 밀리지 않는다.
@Entity()
@Index(['groupId', 'startDate'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  // 일정 종류 (가족 모임·기념일·여행 …). 색은 앱이 이 이름으로 정한다 —
  // 색을 저장하면 나중에 색을 바꿀 때 예전 일정만 옛 색으로 남는다.
  @Column({ type: 'varchar', length: 20, nullable: true })
  category: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 적었는지 (그룹 내 호칭). 탈퇴하면 null — 일정은 가족 것이라 그대로 남는다.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  createdBy: Membership | null;

  @Column({ nullable: true })
  createdById: string | null;
}
