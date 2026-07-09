import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Family } from './family.entity';
import { Role } from './role.enum';

// 유저 ↔ 가족 (가족 내 호칭·역할)
@Entity()
@Unique(['user', 'family'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nickname: string; // 가족 내 호칭 (엄마, 이모, 삼촌 …)

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Family, (f) => f.memberships, { onDelete: 'CASCADE' })
  family: Family;
}
