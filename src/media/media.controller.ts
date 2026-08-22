import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/media.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get('groups/:groupId/media')
  @ApiOperation({ summary: '그룹의 일상 사진 목록 (최신순)' })
  list(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.media.list(user.id, groupId);
  }

  // 업로드와 DB 기록을 한 요청으로 (고아 파일 방지). 자세한 이유는 서비스에.
  @Post('groups/:groupId/media')
  @ApiOperation({
    summary: '일상 사진 올리기 (multipart, field=file) — 업로드+등록을 한 번에',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB 제한
      fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('이미지 파일이 없습니다.');
    return this.media.createWithFile(user.id, groupId, file, caption ?? '');
  }

  // 이미 업로드된 URL 로 등록하는 경로 (업로드를 따로 한 경우)
  @Post('groups/:groupId/media/by-url')
  @ApiOperation({ summary: '일상 사진 등록 (이미 업로드된 URL 로)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateMediaDto,
  ) {
    return this.media.create(user.id, groupId, dto);
  }

  @Get('media/:mediaId')
  @ApiOperation({ summary: '일상 사진 상세' })
  getOne(@CurrentUser() user: AuthUser, @Param('mediaId') mediaId: string) {
    return this.media.getOne(user.id, mediaId);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: '일상 사진 삭제 (올린 본인만)' })
  remove(@CurrentUser() user: AuthUser, @Param('mediaId') mediaId: string) {
    return this.media.remove(user.id, mediaId);
  }
}
