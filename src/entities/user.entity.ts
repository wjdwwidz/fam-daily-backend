import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Membership } from './membership.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // 소셜 로그인 유저는 비밀번호가 없으므로 nullable
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column()
  name: string;

  // 'local' | 'kakao' — 가입 경로
  @Column({ type: 'varchar', default: 'local' })
  provider: string;

  // 소셜 제공자 회원번호 (local 유저는 null)
  @Column({ type: 'varchar', nullable: true })
  providerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];
}
