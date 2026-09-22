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

  // 언제의 일인지 — 올린 날과 다를 수 있다 (여행 다녀와서 올리기 등). 고르지 않으면 null.
  // 하루면 takenFrom 만, 며칠이면 takenTo 까지. 시각 없는 날짜(date)라 시간대로 하루 밀리지 않는다.
  @Column({ type: 'date', nullable: true })
  takenFrom: string | null;

  @Column({ type: 'date', nullable: true })
  takenTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
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
