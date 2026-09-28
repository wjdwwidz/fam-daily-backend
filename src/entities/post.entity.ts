import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';
import { PostComment } from './post-comment.entity';

// 가족 게시판 글. 제목 없이 내용만 — 한마디 남기듯 쓰는 자리다.
@Entity()
@Index(['groupId', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // 어느 가족의 글인지
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 썼는지 (그룹 내 호칭). 탈퇴하면 null — 글은 가족 것이라 그대로 남는다.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;

  @OneToMany(() => PostComment, (c) => c.post)
  comments: PostComment[];
}
