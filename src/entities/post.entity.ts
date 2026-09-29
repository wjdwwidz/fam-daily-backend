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
import type { LinkPreview } from '../links/link-preview.service';
import { Group } from './group.entity';
import { Membership } from './membership.entity';
import { PostComment } from './post-comment.entity';

// 가족 게시판 글. 제목 없이 내용만 — 한마디 남기듯 쓰는 자리다.
@Entity()
@Index(['groupId', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 공지로 올린 글만 제목을 단다 (평소 글은 내용만)
  @Column({ type: 'varchar', length: 60, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  text: string;

  // 공지로 올린 시각. 비어 있으면 보통 글. 공지는 목록 맨 위에 최근에 올린 순으로 선다.
  @Column({ type: 'timestamptz', nullable: true })
  pinnedAt: Date | null;

  // 본문에 붙인 링크의 카드 정보 (본문 순서대로). 저장할 때 읽어 두어 글을 열 때마다 다시 읽지 않는다.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  links: LinkPreview[];

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
