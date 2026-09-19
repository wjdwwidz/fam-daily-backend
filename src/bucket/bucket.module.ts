import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BucketService } from './bucket.service';
import { BucketController } from './bucket.controller';
import { BucketItem } from '../entities/bucket-item.entity';
import { Media } from '../entities/media.entity';
import { Membership } from '../entities/membership.entity';

// 가족 버킷리스트 — 1~100 번 칸을 골라 채우고, 달성하면 일상 글과 이어붙인다
@Module({
  imports: [TypeOrmModule.forFeature([BucketItem, Media, Membership])],
  controllers: [BucketController],
  providers: [BucketService],
})
export class BucketModule {}
