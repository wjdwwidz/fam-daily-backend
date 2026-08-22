import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { MediaService } from './media.service';

// 한 글에 담을 수 있는 최대 개수와 개당 크기.
// 메모리 버퍼링이라 이 둘의 곱이 곧 최악의 순간 메모리 사용량이다.
const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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
  //
  // 파일은 메모리에 버퍼링된다(multer 기본). 영상은 사진보다 훨씬 크므로
  // 장수(MAX_FILES)와 개당 크기(MAX_FILE_SIZE)를 함께 제한한다.
  @Post('groups/:groupId/media')
  @ApiOperation({
    summary: '일상 올리기 (multipart, field=files) — 사진·영상 여러 개를 글 하나로',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
      fileFilter: (_req, file, cb) =>
        cb(null, /^(image|video)\//.test(file.mimetype)),
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('caption') caption?: string,
  ) {
    if (!files?.length) throw new BadRequestException('사진이나 영상을 선택해주세요.');
    return this.media.createWithFiles(user.id, groupId, files, caption ?? '');
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
