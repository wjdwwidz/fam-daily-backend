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

// 한마디 기록. membership.mood 는 '지금 상태'라 덮어쓰이므로, 남긴 순간을 따로 쌓아둔다.
// 이 표는 덧붙이기만 한다 — 나중에 한마디를 고쳐도 지난 줄의 내용은 그대로다.
@Entity()
@Index(['groupId', 'createdAt'])
export class MoodLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  text: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  emoji: string | null;

  // timestamptz 로 둔다. 시간대 없는 timestamp 면 DB(UTC) 시각이 그대로 내려가
  // 앱이 한국시간으로 읽어 9시간 어긋난다.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 남겼는지 (그룹 내 호칭). 탈퇴하면 null — 글·댓글처럼 호칭만 남는다.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
