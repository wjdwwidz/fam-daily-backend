import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { accountDeletionPage, privacyPage, type LegalContact } from './pages';

// 스토어 등록용 공개 페이지. 로그인 없이 누구나 볼 수 있어야 해서 /api 접두사 밖에 둔다 (main.ts).
@ApiExcludeController()
@Controller()
export class LegalController {
  constructor(private readonly config: ConfigService) {}

  private contact(): LegalContact {
    return {
      owner: this.config.get<string>('PRIVACY_OWNER_NAME') ?? '',
      email: this.config.get<string>('PRIVACY_CONTACT_EMAIL') ?? '',
    };
  }

  @Get('privacy')
  privacy(@Res() res: Response) {
    res.type('html').send(privacyPage(this.contact()));
  }

  @Get('account-deletion')
  accountDeletion(@Res() res: Response) {
    res.type('html').send(accountDeletionPage(this.contact()));
  }
}
