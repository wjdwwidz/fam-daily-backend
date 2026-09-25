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

  // 해마다 같은 날 돌아오는 일정 (생일·기념일).
  // 달력에는 보고 있는 해의 날짜로, 홈 D-day 는 다음 차례까지 센다.
  @Column({ type: 'boolean', default: false })
  repeatYearly: boolean;

  // 홈에 띄울지. 켠 일정만 홈에 보인다.
  @Column({ type: 'boolean', default: false })
  isDday: boolean;

  // 세는 방법 — 'dday'(남은 날), 'count'(지난 날수), 'week'(주수).
  // 남은 날은 지나면 홈에서 빠지지만, 지난 날수·주수는 계속 센다 (100일·12주차처럼).
  @Column({ type: 'varchar', length: 10, default: 'dday' })
  ddayMode: string;

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
