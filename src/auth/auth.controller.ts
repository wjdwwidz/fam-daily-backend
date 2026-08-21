import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthUser } from './current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인 시작 (카카오 인증 화면으로 리다이렉트)' })
  kakaoLogin(@Query('redirect') redirect: string, @Res() res: Response) {
    // redirect: 로그인 성공 후 돌아갈 주소 (앱 딥링크 등). 없으면 기본 프론트로.
    return res.redirect(this.auth.buildKakaoAuthUrl(redirect));
  }

  @Get('kakao/callback')
  @ApiOperation({
    summary: '카카오 로그인 콜백 (인가 코드 처리 후 프론트/앱으로 리다이렉트)',
  })
  async kakaoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { accessToken } = await this.auth.loginWithKakao(code);
    // state 로 전달된 앱 딥링크(있으면)로, 없으면 기본 프론트 주소로 토큰 붙여 리다이렉트
    const base = state || this.config.getOrThrow<string>('FRONTEND_REDIRECT_URL');
    const sep = base.includes('?') ? '&' : '?';
    const url = `${base}${sep}token=${encodeURIComponent(accessToken)}`;
    return res.redirect(url);
  }

  @Get('success')
  @ApiOperation({ summary: '[개발용] 로그인 성공 페이지 (발급된 토큰 표시)' })
  loginSuccess(@Query('token') token: string, @Res() res: Response) {
    // 프론트가 아직 없을 때 카카오 로그인 흐름을 백엔드에서 끝내고 토큰을 확인하기 위한 개발용 페이지
    const safe = String(token ?? '').replace(/[<>"']/g, '');
    res.type('html').send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>로그인 성공</title></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px">
<h2>✅ 카카오 로그인 성공</h2>
<p>발급된 액세스 토큰:</p>
<textarea readonly style="width:100%;height:120px;font-family:monospace;font-size:12px" onclick="this.select()">${safe}</textarea>
<button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value)"
  style="margin-top:12px;padding:8px 16px;font-size:14px;cursor:pointer">토큰 복사</button>
<p style="color:#666;font-size:13px;margin-top:16px">이 토큰을 <code>Authorization: Bearer &lt;토큰&gt;</code> 헤더로 API 호출에 사용하세요.</p>
</body></html>`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 프로필(이름) 수정' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  // 업로드와 DB 기록을 한 요청으로 묶는다 (고아 파일 방지). 자세한 이유는 서비스에.
  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 프로필 사진 교체 (multipart, field=file) — 업로드+저장을 한 번에',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB 제한
      fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
    }),
  )
  updatePhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('이미지 파일이 없습니다.');
    return this.auth.updatePhoto(user.id, file);
  }
}
