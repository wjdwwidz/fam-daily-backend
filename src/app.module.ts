import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { WordsModule } from './words/words.module';
import { QnaModule } from './qna/qna.module';
import { AppController } from './app.controller';
import { User } from './entities/user.entity';
import { Group } from './entities/group.entity';
import { Membership } from './entities/membership.entity';
import { Invite } from './entities/invite.entity';
import { Word } from './entities/word.entity';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Group, Membership, Invite, Word, Question, Answer],
        synchronize: true, // 개발용: 엔티티 기준으로 테이블 자동 생성 (운영은 마이그레이션 사용)
        // 클라우드 Postgres(Supabase 등)는 SSL 필요 → 배포 시 DB_SSL=true. 로컬 Docker는 미설정(=false)
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    AuthModule,
    GroupsModule,
    WordsModule,
    QnaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
