import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Membership } from './membership.entity';

// 프로필 사진 변경 기록. membership.photoUrl 은 '지금 사진'이라 덮어쓰이므로,
// 바꾼 순간을 한 줄씩 쌓아 한마디 기록과 같은 화면에서 함께 본다.
@Entity()
@Index(['groupId', 'createdAt'])
export class ProfileLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 바꾼 사진. null 이면 사진을 지운 것 (이니셜로 돌아감)
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  // timestamptz 로 둔다. 시간대 없는 timestamp 면 DB(UTC) 시각이 그대로 내려가
  // 앱이 한국시간으로 읽어 9시간 어긋난다.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  groupId: string;

  // 누가 바꿨는지 (그룹 내 호칭). 탈퇴하면 null — 호칭만 남는다.
  @ManyToOne(() => Membership, { onDelete: 'SET NULL', nullable: true })
  author: Membership | null;

  @Column({ nullable: true })
  authorId: string | null;
}
