import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Invite } from '../entities/invite.entity';

// 초대 코드 발급/검증 로직
@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite) private readonly invites: Repository<Invite>,
    private readonly config: ConfigService,
  ) {}

  // 초대 링크 = 웹 앱의 /join/코드. 누르면 로그인 뒤 코드가 채워진 참여 화면으로 간다.
  // 주소는 환경변수로 둔다 — 웹 도메인이 바뀌어도 앱을 다시 빌드하지 않아도 되게.
  // 설정 전에는 없는 주소를 보내지 않도록 링크를 비운다 (코드만 공유).
  private inviteLink(code: string): string | null {
    const base = this.config.get<string>('WEB_APP_URL')?.trim().replace(/\/+$/, '');
    return base ? `${base}/join/${code}` : null;
  }

  // 초대 코드 생성
  async create(groupId: string, expiresInDays?: string) {
    const code = randomBytes(6).toString('base64url'); // 8자 정도의 URL-safe 코드
    const days = expiresInDays ? Number(expiresInDays) : null;
    const expiresAt =
      days && !Number.isNaN(days)
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

    const invite = await this.invites.save(
      this.invites.create({ code, group: { id: groupId } as any, expiresAt }),
    );
    return {
      code: invite.code,
      link: this.inviteLink(invite.code),
      expiresAt: invite.expiresAt,
    };
  }

  // 코드로 유효한 초대 조회 (없거나 만료면 예외) — group 관계 포함
  async getValidByCode(code: string) {
    const invite = await this.invites.findOne({
      where: { code },
      relations: { group: true },
    });
    if (!invite) throw new NotFoundException('유효하지 않은 초대 코드입니다.');
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new ForbiddenException('만료된 초대 코드입니다.');
    return invite;
  }
}
