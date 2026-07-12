import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthUser } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인 (JWT 발급)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인 시작 (카카오 인증 화면으로 리다이렉트)' })
  kakaoLogin(@Res() res: Response) {
    return res.redirect(this.auth.buildKakaoAuthUrl());
  }

  @Get('kakao/callback')
  @ApiOperation({
    summary: '카카오 로그인 콜백 (인가 코드 처리 후 프론트로 리다이렉트)',
  })
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    const { accessToken } = await this.auth.loginWithKakao(code);
    const frontend = this.config.getOrThrow<string>('FRONTEND_REDIRECT_URL');
    const url = new URL(frontend);
    url.searchParams.set('token', accessToken);
    return res.redirect(url.toString());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
