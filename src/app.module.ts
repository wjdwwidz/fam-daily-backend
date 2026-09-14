import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { WordsModule } from './words/words.module';
import { MediaModule } from './media/media.module';
import { QnaModule } from './qna/qna.module';
import { UploadsModule } from './uploads/uploads.module';
import { LegalModule } from './legal/legal.module';
import { AppController } from './app.controller';
import { typeOrmOptions } from './database/typeorm-options';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // 스윕(버려진 업로드 청소) 스케줄러
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');
        // [진단] 어느 DB로 접속 시도하는지 (비번 제외) — Railway 로그에서 확인용
        console.log(
          `[DB] mode=${host ? 'fields' : 'url'} host=${host ?? '(none→URL fallback)'} port=${config.get<string>('DB_PORT') ?? '(default)'} ssl=${config.get<string>('DB_SSL')}`,
        );
        return {
          ...typeOrmOptions((key) => config.get<string>(key)),
          // 서버가 뜰 때 아직 적용 안 된 마이그레이션을 실행한다 (운영 배포 = 마이그레이션 적용)
          migrationsRun: true,
        };
      },
    }),
    AuthModule,
    GroupsModule,
    WordsModule,
    MediaModule,
    QnaModule,
    UploadsModule,
    LegalModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
