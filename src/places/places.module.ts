import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

// 구글 장소 검색 — 키를 서버에만 두려고 앱과 구글 사이를 잇는다
@Module({
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
