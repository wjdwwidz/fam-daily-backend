import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { name: '우리끼리 가족앱 API', status: 'ok' };
  }

  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
