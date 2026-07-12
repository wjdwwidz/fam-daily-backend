import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { MembershipsService } from './memberships.service';
import { InvitesService } from './invites.service';
import { GroupsController } from './groups.controller';
import { Group } from '../entities/group.entity';
import { Membership } from '../entities/membership.entity';
import { Invite } from '../entities/invite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Membership, Invite])],
  controllers: [GroupsController],
  providers: [GroupsService, MembershipsService, InvitesService],
})
export class GroupsModule {}
