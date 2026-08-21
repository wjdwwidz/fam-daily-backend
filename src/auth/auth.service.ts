import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { UpdateMeDto } from './dto/update-me.dto';
import { StorageService } from '../uploads/storage.service';

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

// 카카오가 이름을 안 내려줄 때만 쓰는 임시 이름. 나중 로그인에서 실제 닉네임으로 교체된다.
const KAKAO_FALLBACK_NAME = '카카오 사용자';

interface KakaoUser {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
      is_default_image?: boolean;
    };
  };
  // 구버전 필드. 동의항목 설정에 따라 kakao_account 대신 여기만 채워지는 경우가 있다.
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
}

@Injectable()
export class AuthService {
  // [임시 진단] 카카오 닉네임 미수신 디버깅용 — 확인 후 제거
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  private sign(user: { id: string; email: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  // 내 프로필(이름) 수정
  async updateMe(userId: string, dto: UpdateMeDto) {
    // 사진을 바꾸는 요청이면, 교체 후 지울 수 있게 예전 URL 을 먼저 확보
    let oldPhotoUrl: string | null = null;
    if (dto.photoUrl !== undefined) {
      const current = await this.users.findOne({
        where: { id: userId },
        select: { photoUrl: true },
      });
      oldPhotoUrl = current?.photoUrl ?? null;
    }
    await this.users.update(
      { id: userId },
      {
        name: dto.name,
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      },
    );
    // 사진이 실제로 바뀌었으면 예전 파일은 Storage 에서 제거 (기록 안 남김)
    if (
      dto.photoUrl !== undefined &&
      oldPhotoUrl &&
      oldPhotoUrl !== dto.photoUrl
    ) {
      await this.storage.removeByUrl(oldPhotoUrl);
    }
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
    };
  }

  // 프로필 사진 교체 — 업로드와 DB 기록을 한 요청 안에서 끝낸다.
  //
  // 클라이언트가 "업로드 → 그 URL 로 저장" 두 번 호출하면, 업로드만 성공하고
  // 저장을 안 하거나 실패할 때 아무도 참조하지 않는 파일이 버킷에 남는다.
  // 여기서는 DB 기록이 실패하면 방금 올린 파일을 되돌려 그 구멍을 막는다.
  async updatePhoto(userId: string, file: Express.Multer.File) {
    const current = await this.users.findOne({
      where: { id: userId },
      select: { photoUrl: true },
    });
    if (!current) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const oldPhotoUrl = current.photoUrl ?? null;

    const url = await this.storage.upload(file, 'profiles');
    try {
      const res = await this.users.update({ id: userId }, { photoUrl: url });
      if (!res.affected) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    } catch (e) {
      // DB 기록 실패 → 방금 올린 파일은 아무도 가리키지 않는다. 되돌린다.
      await this.storage.removeByUrl(url);
      throw e;
    }

    // 여기서부터는 새 사진이 DB 에 확정됐다. 예전 파일은 지워도 안전하다.
    if (oldPhotoUrl && oldPhotoUrl !== url) {
      await this.storage.removeByUrl(oldPhotoUrl);
    }
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
    // 동의항목(scope)을 명시해야 카카오가 닉네임/프로필사진을 내려준다.
    // 단, 콘솔(카카오 로그인 > 동의항목)에서 활성화한 항목만 요청 가능 — 아니면 KOE205 로 로그인이 막힌다.
    // 프로필 사진까지 받으려면 KAKAO_SCOPE=profile_nickname,profile_image 로 설정.
    const scope = this.config.get<string>('KAKAO_SCOPE') ?? 'profile_nickname';
    if (scope) params.set('scope', scope);
    if (redirect) params.set('state', redirect);
    return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
  }

  // 2~5) 콜백: 인가 코드 → 토큰 → 사용자정보 → 유저 찾기/생성 → 우리 JWT 발급
  async loginWithKakao(code: string) {
    const kakaoAccessToken = await this.exchangeKakaoToken(code);
    const kakaoUser = await this.fetchKakaoUser(kakaoAccessToken);

    const providerId = String(kakaoUser.id);
    const { nickname, photoUrl } = this.extractKakaoProfile(kakaoUser);
    // [임시 진단]
    this.logger.log(
      `[kakao] 로그인 시도 providerId=${providerId} nickname=${nickname ?? 'null'} photo=${photoUrl ? 'yes' : 'no'}`,
    );
    let user = await this.users.findOne({
      where: { provider: 'kakao', providerId },
    });

    if (!user) {
      const email =
        kakaoUser.kakao_account?.email ?? `kakao_${providerId}@kakao.local`;
      user = await this.users.save(
        this.users.create({
          email,
          name: nickname ?? KAKAO_FALLBACK_NAME,
          photoUrl,
          provider: 'kakao',
          providerId,
        }),
      );
    } else {
      // 기존 유저: 앱에서 직접 고친 이름/사진은 그대로 두고,
      // 비어 있거나 아직 임시 이름인 경우에만 카카오 정보로 채운다.
      const patch: Partial<User> = {};
      if (nickname && (!user.name || user.name === KAKAO_FALLBACK_NAME)) {
        patch.name = nickname;
      }
      if (photoUrl && !user.photoUrl) patch.photoUrl = photoUrl;
      if (Object.keys(patch).length > 0) {
        Object.assign(user, patch);
        await this.users.save(user);
      }
    }

    const safe = { id: user.id, email: user.email, name: user.name };
    return {
      user: { ...safe, photoUrl: user.photoUrl },
      accessToken: this.sign(safe),
    };
  }

  // 카카오 응답에서 닉네임/프로필사진 추출.
  // kakao_account.profile 이 비면 구버전 properties 로 폴백.
  private extractKakaoProfile(kakaoUser: KakaoUser) {
    const profile = kakaoUser.kakao_account?.profile;
    const legacy = kakaoUser.properties;
    const nickname =
      profile?.nickname?.trim() || legacy?.nickname?.trim() || null;
    // 카카오 기본 이미지면 가져오지 않는다 (앱의 색+이니셜 아바타가 낫다)
    const photoUrl = profile?.is_default_image
      ? null
      : profile?.profile_image_url || legacy?.profile_image || null;
    return { nickname, photoUrl };
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
      throw new UnauthorizedException(
        '카카오 사용자 정보 조회에 실패했습니다.',
      );
    const data = (await res.json()) as KakaoUser;
    // [임시 진단] 카카오가 실제로 내려주는 프로필 필드 확인
    this.logger.log(
      `[kakao] /v2/user/me profile=${JSON.stringify(
        data.kakao_account?.profile ?? null,
      )} properties=${JSON.stringify(data.properties ?? null)}`,
    );
    return data;
  }
}
