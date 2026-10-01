import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { Post } from '../entities/post.entity';
import { PostComment } from '../entities/post-comment.entity';
import { Membership } from '../entities/membership.entity';
import { LinksModule } from '../links/links.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostComment, Membership]),
    LinksModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
