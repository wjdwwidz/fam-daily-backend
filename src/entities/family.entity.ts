import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Membership } from './membership.entity';
import { Invite } from './invite.entity';

// 가족 공간
@Entity()
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Membership, (m) => m.family)
  memberships: Membership[];

  @OneToMany(() => Invite, (i) => i.family)
  invites: Invite[];
}
