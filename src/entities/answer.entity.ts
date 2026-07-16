import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { Membership } from './membership.entity';

// 문답 답변 — 한 질문에 대해 멤버당 하나 (다시 쓰면 수정)
@Entity()
@Unique(['question', 'author'])
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
