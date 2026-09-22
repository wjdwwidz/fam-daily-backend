import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
@UseGuards(JwtAuthGuard)
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('search')
  @ApiOperation({
    summary: '장소 검색 (구글) — 일상에 붙일 곳을 찾는다. 해외도 된다',
  })
  @ApiQuery({ name: 'q', example: '성수 카페' })
  search(@Query('q') q?: string) {
    return this.places.search(q ?? '');
  }
}
