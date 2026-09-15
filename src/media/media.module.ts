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
import { MediaComment } from '../entities/media-comment.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, MediaComment, Membership, PendingUpload]),
    UploadsModule,
  ],
  controllers: [MediaController, CommentsController, SweepController],
  providers: [MediaService, CommentsService, SweepService],
})
export class MediaModule {}
