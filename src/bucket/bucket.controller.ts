import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { BucketService } from './bucket.service';
import { MoveBucketDto, SaveBucketDto } from './dto/bucket.dto';

@ApiTags('bucket')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class BucketController {
  constructor(private readonly bucket: BucketService) {}

  @Get('groups/:groupId/bucket')
  @ApiOperation({ summary: '가족 버킷리스트 — 채운 칸과 진행률 (멤버만)' })
  list(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.bucket.list(user.id, groupId);
  }

  @Get('groups/:groupId/bucket/:no')
  @ApiOperation({ summary: '버킷리스트 한 칸 보기' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('no', ParseIntPipe) no: number,
  ) {
    return this.bucket.getOne(user.id, groupId, no);
  }

  @Put('groups/:groupId/bucket/:no')
  @ApiOperation({ summary: '버킷리스트 한 칸 쓰기·고치기 (번호를 골라 채운다)' })
  save(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('no', ParseIntPipe) no: number,
    @Body() dto: SaveBucketDto,
  ) {
    return this.bucket.save(user.id, groupId, no, dto);
  }

  @Put('groups/:groupId/bucket/:no/move')
  @ApiOperation({ summary: '칸을 다른 번호로 옮기기 (우선순위 조정)' })
  move(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('no', ParseIntPipe) no: number,
    @Body() dto: MoveBucketDto,
  ) {
    return this.bucket.move(user.id, groupId, no, dto.to);
  }

  @Delete('groups/:groupId/bucket/:no')
  @ApiOperation({ summary: '버킷리스트 한 칸 비우기' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('no', ParseIntPipe) no: number,
  ) {
    return this.bucket.remove(user.id, groupId, no);
  }
}
