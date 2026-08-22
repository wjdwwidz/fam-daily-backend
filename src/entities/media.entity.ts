import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';

export type MediaItem = {
  url: string;
  type: 'image' | 'video';
};

// 일상 게시글 — 특정 그룹에 속하고, 올린 사람(멤버십)에 연결됨
@Entity()
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 게시글 한 개에 사진·영상 여러 개. 고른 순서 그대로 보여준다.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: MediaItem[];

  // 이전 버전(한 장짜리)에서 만들어진 글을 계속 읽기 위해 남겨둔 컬럼.
  // 새 글은 items 에만 쓴다.
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'text', default: '' })
  caption: string; // 이 순간을 한 줄로

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 올렸는지 (그룹 내 호칭을 얻기 위해 멤버십에 연결). 멤버 탈퇴 시 null.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
