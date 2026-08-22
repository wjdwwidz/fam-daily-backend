import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';

// 일상 사진 — 특정 그룹에 속하고, 올린 사람(멤버십)에 연결됨
@Entity()
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  photoUrl: string; // Supabase Storage 의 public URL

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
