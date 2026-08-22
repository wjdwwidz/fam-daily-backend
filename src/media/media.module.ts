import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Media } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Membership]), UploadsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
