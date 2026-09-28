import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';
import { Post } from './post.entity';

// 게시판 글의 댓글. 일상 댓글(MediaComment)과 같은 규칙 —
// 답글은 한 단계까지고, parent 는 늘 최상위 댓글이다.
@Entity()
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // 답글이 달린 댓글을 지우면 내용만 비우고 이 시각을 남긴다 ("삭제된 댓글이에요").
  // 답글까지 다 사라지면 행 자체를 지운다.
  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Post, (p) => p.comments, { onDelete: 'CASCADE' })
  post: Post;

  @Column()
  postId: string;

  // 최근 활동을 가족 기준으로 바로 찾으려고 같이 둔다 (글을 거치지 않게)
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 답글이면 부모(최상위) 댓글
  @ManyToOne(() => PostComment, { onDelete: 'CASCADE', nullable: true })
  parent: PostComment | null;

  @Column({ nullable: true })
  parentId: string | null;

  // 누가 썼는지 (그룹 내 호칭). 멤버 탈퇴 시 null.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
