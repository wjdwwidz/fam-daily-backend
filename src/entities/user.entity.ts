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

  // 카카오가 준 닉네임. name 은 앱에서 고치면 바뀌지만 이건 로그인할 때마다 카카오 값으로 맞춘다
  // (프로필 화면에 '기본 이름'으로 보여준다). 이 칸이 생기기 전 가입자는 다음 로그인 때 채워진다.
  @Column({ type: 'varchar', length: 100, nullable: true })
  kakaoName: string | null;

  // 프로필 사진 URL (Supabase Storage). 없으면 색+이니셜 아바타
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  // 소셜 가입 경로: 'kakao' (추후 'google' 등 확장)
  @Column({ type: 'varchar', default: 'kakao' })
  provider: string;

  // 소셜 제공자 회원번호 (local 유저는 null)
  @Column({ type: 'varchar', nullable: true })
  providerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.user)
  memberships: Membership[];
}
