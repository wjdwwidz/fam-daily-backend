import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Media } from './media.entity';
import { Membership } from './membership.entity';

// 가족 버킷리스트 한 칸. 번호(1~100)는 가족마다 고정이고, 채운 칸만 행이 생긴다.
// 빈 칸은 행이 없다 — 100개를 미리 만들어두면 가족을 만들 때마다 100행씩 쌓인다.
@Entity()
@Index(['groupId', 'no'], { unique: true })
export class BucketItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1~100. 사용자가 원하는 번호를 골라 채운다.
  @Column({ type: 'int' })
  no: number;

  // 한 줄에 떨어지게 30자로 제한한다 (A4 에 적은 것처럼 줄 높이를 고르게)
  @Column({ type: 'varchar', length: 30 })
  text: string;

  // 누가 적었는지 (그룹 내 호칭). 탈퇴하면 null — 글·댓글처럼 호칭만 남는다.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  createdBy: Membership | null;

  @Column({ nullable: true })
  createdById: string | null;

  // 가족 공동 달성 — 누가 눌렀든 가족의 기록이다. 누른 사람은 doneBy 로 남긴다.
  @Column({ type: 'timestamptz', nullable: true })
  doneAt: Date | null;

  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  doneBy: Membership | null;

  @Column({ nullable: true })
  doneById: string | null;

  // 이 칸과 이어지는 일상 글 (글이 지워지면 연결만 풀린다)
  @ManyToOne(() => Media, { onDelete: 'SET NULL', nullable: true })
  media: Media | null;

  @Column({ nullable: true })
  mediaId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;
}
