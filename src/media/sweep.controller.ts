import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SweepService } from './sweep.service';

// 스윕을 밖에서 깨우기 위한 통로.
//
// Railway 는 트래픽이 없으면 인스턴스를 재울 수 있어서, 앱 안의 @Cron 이
// 새벽에 안 돌 수 있다. GitHub Actions 등에서 하루 한 번 여기를 호출하면
// 앱이 자고 있어도 깨어나 청소한다.
//
// ADMIN_SWEEP_TOKEN 이 없으면 항상 거부한다 (설정 안 한 배포에서 열리지 않게).
@ApiTags('admin')
@Controller('admin')
export class SweepController {
  constructor(
    private readonly sweep: SweepService,
    private readonly config: ConfigService,
  ) {}

  @Post('sweep')
  @ApiOperation({
    summary: '[관리] 버려진 업로드 청소 (헤더 x-sweep-token 필요)',
  })
  async run(@Headers('x-sweep-token') token?: string) {
    const expected = this.config.get<string>('ADMIN_SWEEP_TOKEN');
    if (!expected || token !== expected) {
      throw new UnauthorizedException();
    }
    return this.sweep.sweep();
  }
}
