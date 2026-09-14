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

  // 사진 여러 장 (최대 10장). 고른 순서 그대로 보여준다.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  photoUrls: string[];

  // 한 장짜리 시절 컬럼. 첫 장을 계속 같이 기록한다 —
  // 업데이트 안 한 앱이 이 값만 읽고 쓰기 때문이고, 백엔드를 되돌려도 첫 장은 남는다.
  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

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
