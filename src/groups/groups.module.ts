import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { MembershipsService } from './memberships.service';
import { InvitesService } from './invites.service';
import { GroupsController } from './groups.controller';
import { Group } from '../entities/group.entity';
import { Membership } from '../entities/membership.entity';
import { Invite } from '../entities/invite.entity';
import { MoodLog } from '../entities/mood-log.entity';
import { ProfileLog } from '../entities/profile-log.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, Membership, Invite, MoodLog, ProfileLog]),
    UploadsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, MembershipsService, InvitesService],
})
export class GroupsModule {}
