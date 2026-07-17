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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (g) => g.memberships, { onDelete: 'CASCADE' })
  group: Group;
}
