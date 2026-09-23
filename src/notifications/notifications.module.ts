import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaComment } from '../entities/media-comment.entity';
import { Membership } from '../entities/membership.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// 알림 — 나에게 온 것(내 글 댓글·내 댓글 답글)만 모아 본다
@Module({
  imports: [TypeOrmModule.forFeature([MediaComment, Membership])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
