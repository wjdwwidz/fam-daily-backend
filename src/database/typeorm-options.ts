import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { Membership } from '../entities/membership.entity';
import { Invite } from '../entities/invite.entity';
import { Word } from '../entities/word.entity';
import { Media } from '../entities/media.entity';
import { PendingUpload } from '../entities/pending-upload.entity';
import { Question } from '../entities/question.entity';
import { Answer } from '../entities/answer.entity';

// 앱(Nest)과 마이그레이션 CLI 가 같은 DB 설정을 쓰도록 한 곳에 모은다.
//
// 테이블 구조는 마이그레이션으로만 바꾼다. synchronize 를 켜두면 배포할 때마다 엔티티에 맞춰
// 운영 DB 가 자동으로 바뀌고, 컬럼 이름 하나만 바꿔도 그 컬럼의 데이터가 지워진다.
export function typeOrmOptions(
  env: (key: string) => string | undefined,
): DataSourceOptions {
  // CLI 를 ts 로 돌리면 .ts, 빌드된 앱(dist)에서는 .js 마이그레이션을 읽는다
  const ext = __filename.endsWith('.ts') ? 'ts' : 'js';
  const common = {
    type: 'postgres' as const,
    entities: [
      User, Group, Membership, Invite, Word, Question, Answer,
      Media, PendingUpload,
    ],
    migrations: [join(__dirname, '..', 'migrations', `*.${ext}`)],
    synchronize: false,
    // 클라우드 Postgres(Supabase 등)는 SSL 필요 → DB_SSL=true. 로컬 Docker는 미설정(=false)
    ssl: env('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
  };
  // DB_HOST가 있으면 필드별 접속(특수문자 비번 URL 인코딩 문제 회피), 없으면 DATABASE_URL 사용
  const host = env('DB_HOST');
  if (host) {
    return {
      ...common,
      host,
      port: Number(env('DB_PORT')) || 5432,
      username: env('DB_USER'),
      password: env('DB_PASSWORD'),
      database: env('DB_NAME') || 'postgres',
    };
  }
  return { ...common, url: env('DATABASE_URL') };
}
