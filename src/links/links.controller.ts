import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { extractUrls, LinkPreviewService } from './link-preview.service';

// 글을 쓰는 동안 링크 카드를 미리 보여주기 위한 통로.
// 저장할 때도 서버가 같은 방법으로 읽어 글에 붙이므로, 이건 보여주기용이다.
@ApiTags('board')
@ApiBearerAuth()
@Controller('link-preview')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly links: LinkPreviewService) {}

  @Get()
  @ApiOperation({
    summary: '링크 미리보기 — 제목·요약·썸네일·사이트 이름 (못 읽으면 주소만)',
  })
  @ApiQuery({ name: 'url', example: 'https://blog.naver.com/...' })
  preview(@Query('url') url?: string) {
    const [clean] = extractUrls(String(url ?? '').slice(0, 2000));
    if (!clean) throw new BadRequestException('http(s) 주소를 넣어주세요.');
    return this.links.preview(clean);
  }
}
