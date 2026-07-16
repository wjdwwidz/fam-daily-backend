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

// 가족 사전 단어 — 특정 그룹에 속하고, 작성자(멤버십)에 연결됨
@Entity()
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  term: string; // 단어 (예: 응아)

  @Column({ default: '' })
  reading: string; // 발음/읽기 (예: 응아응아)

  @Column({ type: 'text' })
  meaning: string; // 뜻

  @Column({ type: 'text', default: '' })
  example: string; // 이럴 때 써요

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null; // 사진 (지금은 URL 문자열, 추후 파일 업로드)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 어느 그룹의 단어인지
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 등록했는지 (그룹 내 호칭을 얻기 위해 멤버십에 연결). 멤버 탈퇴 시 null.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
