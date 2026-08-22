import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Media } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';
import { PendingUpload } from '../entities/pending-upload.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { SweepService } from './sweep.service';
import { SweepController } from './sweep.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, Membership, PendingUpload]),
    UploadsModule,
  ],
  controllers: [MediaController, SweepController],
  providers: [MediaService, SweepService],
})
export class MediaModule {}
