import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesService } from './families.service';
import { FamiliesController } from './families.controller';
import { Family } from '../entities/family.entity';
import { Membership } from '../entities/membership.entity';
import { Invite } from '../entities/invite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Family, Membership, Invite])],
  controllers: [FamiliesController],
  providers: [FamiliesService],
})
export class FamiliesModule {}
