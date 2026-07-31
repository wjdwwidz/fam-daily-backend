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

  @Column()
  name: string;

  // 프로필 사진 URL (Supabase Storage). 없으면 색+이니셜 아바타
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  // 소셜 가입 경로: 'kakao' (추후 'google' 등 확장)
  @Column({ type: 'varchar', default: 'kakao' })
  provider: string;

  // 소셜 제공자 회원번호 (local 유저는 null)
  @Column({ type: 'varchar', nullable: true })
  providerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];
}
