import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';
import { Role } from './role.enum';

// 유저 ↔ 그룹 (그룹 내 호칭·역할)
@Entity()
@Unique(['user', 'group'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nickname: string; // 그룹 내 호칭 (엄마, 이모, 삼촌 …)

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;

  // 오늘의 한마디 (그룹 내 나의 현재 상태 메시지)
  @Column({ type: 'varchar', length: 100, nullable: true })
  mood: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  moodEmoji: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  moodAt: Date | null;

  // 이 가족에서 쓰는 내 프로필 사진. 가족마다 다르게 둘 수 있고, 없으면 이니셜로 보인다.
  // (계정 사진으로 대신하지 않는다 — 가족마다 따로 정하는 게 목적이다)
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // 탈퇴하면 null. 멤버십은 지우지 않아서 그 사람이 남긴 글에 호칭이 계속 보인다.
  @ManyToOne(() => User, (u) => u.memberships, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: User | null;

  @ManyToOne(() => Group, (g) => g.memberships, { onDelete: 'CASCADE' })
  group: Group;
}
