import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { Word } from '../entities/word.entity';
import { Media } from '../entities/media.entity';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import { Membership } from '../entities/membership.entity';
import { MediaComment } from '../entities/media-comment.entity';
import { BucketItem } from '../entities/bucket-item.entity';

// 홈 '최근 활동' — 여러 기능(사전·일상·문답·댓글)의 기록을 읽기만 한다
@Module({
  imports: [TypeOrmModule.forFeature([
      Word, Media, MediaComment, Question, Answer, Membership, BucketItem,
    ])],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
