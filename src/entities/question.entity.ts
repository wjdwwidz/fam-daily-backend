import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';
import { Answer } from './answer.entity';

// 가족 문답 질문 — 특정 그룹에 속하고, 만든 사람(멤버십)에 연결됨
@Entity()
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string; // 질문 내용

  @CreateDateColumn()
  createdAt: Date;

  // 어느 그룹의 질문인지
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 냈는지. 멤버 탈퇴 시 null.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;

  @OneToMany(() => Answer, (a) => a.question)
  answers: Answer[];
}
