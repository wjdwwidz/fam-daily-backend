import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { FamiliesModule } from './families/families.module';
import { AppController } from './app.controller';
import { User } from './entities/user.entity';
import { Family } from './entities/family.entity';
import { Membership } from './entities/membership.entity';
import { Invite } from './entities/invite.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Family, Membership, Invite],
        synchronize: true, // 개발용: 엔티티 기준으로 테이블 자동 생성 (운영은 마이그레이션 사용)
      }),
    }),
    AuthModule,
    FamiliesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
