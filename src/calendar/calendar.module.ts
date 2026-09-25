import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Membership } from '../entities/membership.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

// 달력 — 가족이 함께 보는 일정
@Module({
  imports: [TypeOrmModule.forFeature([Event, Membership])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class CalendarModule {}
