import { DataSource } from 'typeorm';
import { typeOrmOptions } from './database/typeorm-options';

// 마이그레이션 CLI 전용 (npm run migration:generate / migration:run).
// 앱은 app.module 에서 같은 설정을 쓴다. 환경변수는 스크립트가 node --env-file=.env 로 넣어준다.
export default new DataSource(typeOrmOptions((key) => process.env[key]));
