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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, (g) => g.memberships, { onDelete: 'CASCADE' })
  group: Group;
}
