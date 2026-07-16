import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QnaService } from './qna.service';
import { QnaController } from './qna.controller';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';
import { Membership } from '../entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer, Membership])],
  controllers: [QnaController],
  providers: [QnaService],
})
export class QnaModule {}
