import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Membership } from './membership.entity';
import { Invite } from './invite.entity';

// 그룹 공간
@Entity()
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.group)
  memberships: Membership[];

  @OneToMany(() => Invite, (i) => i.group)
  invites: Invite[];
}
