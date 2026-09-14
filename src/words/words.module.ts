import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { Word } from '../entities/word.entity';
import { Membership } from '../entities/membership.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [TypeOrmModule.forFeature([Word, Membership]), UploadsModule],
  controllers: [WordsController],
  providers: [WordsService],
})
export class WordsModule {}
