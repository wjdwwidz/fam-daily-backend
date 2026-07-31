import {
  BadRequestException,
  Controller,
  Post,
  Query,
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
import { StorageService } from './storage.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  // multipart/form-data 의 "file" 필드로 이미지 업로드 → { url }
  @Post()
  @ApiOperation({ summary: '이미지 업로드 (multipart, field=file) → { url }' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB 제한
      fileFilter: (_req, file, cb) =>
        cb(null, /^image\//.test(file.mimetype)), // 이미지만
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string, // 예: ?folder=words → words/ 폴더에 저장
  ) {
    if (!file) throw new BadRequestException('이미지 파일이 없습니다.');
    const url = await this.storage.upload(file, folder);
    return { url };
  }
}
