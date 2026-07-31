import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { UpdateMeDto } from './dto/update-me.dto';

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

interface KakaoUser {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string };
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private sign(user: { id: string; email: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  // 내 프로필(이름) 수정
  async updateMe(userId: string, dto: UpdateMeDto) {
    await this.users.update(
      { id: userId },
      {
        name: dto.name,
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      },
    );
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
    };
  }

  // 1) 카카오 로그인 화면으로 보낼 authorize URL 생성
  //    redirect: 로그인 성공 후 앱/프론트로 돌아갈 주소 → state 로 실어보내 콜백에서 사용
  buildKakaoAuthUrl(redirect?: string) {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('KAKAO_REST_API_KEY'),
      redirect_uri: this.config.getOrThrow<string>('KAKAO_REDIRECT_URI'),
      response_type: 'code',
    });
    if (redirect) params.set('state', redirect);
    return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
  }

  // 2~5) 콜백: 인가 코드 → 토큰 → 사용자정보 → 유저 찾기/생성 → 우리 JWT 발급
  async loginWithKakao(code: string) {
    const kakaoAccessToken = await this.exchangeKakaoToken(code);
    const kakaoUser = await this.fetchKakaoUser(kakaoAccessToken);

    const providerId = String(kakaoUser.id);
    let user = await this.users.findOne({
      where: { provider: 'kakao', providerId },
    });

    if (!user) {
      const email =
        kakaoUser.kakao_account?.email ?? `kakao_${providerId}@kakao.local`;
      const name = kakaoUser.kakao_account?.profile?.nickname ?? '카카오 사용자';
      user = await this.users.save(
        this.users.create({
          email,
          name,
          provider: 'kakao',
          providerId,
        }),
      );
    }

    const safe = { id: user.id, email: user.email, name: user.name };
    return { user: safe, accessToken: this.sign(safe) };
  }

  // 인가 코드를 카카오 access token으로 교환
  private async exchangeKakaoToken(code: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.getOrThrow<string>('KAKAO_REST_API_KEY'),
      redirect_uri: this.config.getOrThrow<string>('KAKAO_REDIRECT_URI'),
      code,
    });
    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET');
    if (clientSecret) body.set('client_secret', clientSecret);

    const res = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body,
    });

    if (!res.ok)
      throw new UnauthorizedException('카카오 토큰 교환에 실패했습니다.');

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token)
      throw new UnauthorizedException('카카오 토큰 교환에 실패했습니다.');
    return data.access_token;
  }

  // access token으로 카카오 사용자 정보 조회
  private async fetchKakaoUser(accessToken: string): Promise<KakaoUser> {
    const res = await fetch(KAKAO_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok)
      throw new UnauthorizedException('카카오 사용자 정보 조회에 실패했습니다.');
    return (await res.json()) as KakaoUser;
  }
}
