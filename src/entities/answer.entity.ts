import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { Membership } from './membership.entity';

// 문답 답변 — 댓글처럼 한 질문에 여러 개 달림 (멤버당 여러 답변 가능)
@Entity()
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Question, (q) => q.answers, { onDelete: 'CASCADE' })
  question: Question;

  @Column()
  questionId: string;

  // 누가 답했는지 (그룹 내 호칭). 멤버 탈퇴 시 null.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
