# 우리끼리 가족앱 — 백엔드 (NestJS)

`fam-daily-app`(React Native/Expo) 프론트엔드의 백엔드 API.
**NestJS + Prisma + PostgreSQL + JWT** 기반. 1단계로 **인증(로그인/회원가입)**과
**가족 공간(생성·초대·참여·구성원)**을 제공합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env          # 필요 시 값 수정

# 1) PostgreSQL 실행 (Docker)
docker compose up -d

# 2) DB 마이그레이션
npx prisma migrate dev

# 3) 개발 서버
npm run start:dev             # http://localhost:3000/api
```

> Docker가 없으면 Neon/Supabase 등 무료 클라우드 Postgres의 연결 문자열을
> `.env`의 `DATABASE_URL`에 넣으면 됩니다.

## 인증 방식

- 이메일 + 비밀번호 회원가입/로그인 → **JWT accessToken** 발급
- 보호된 엔드포인트는 `Authorization: Bearer <token>` 헤더 필요
- (다음 단계) 카카오 OAuth 연동 예정

## API

베이스: `http://localhost:3000/api`

### Auth
| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/auth/signup` | 회원가입 `{ email, password, name }` → `{ user, accessToken }` | - |
| POST | `/auth/login` | 로그인 `{ email, password }` → `{ user, accessToken }` | - |
| GET | `/auth/me` | 내 정보 | ✅ |

### Families (가족 공간)
| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/families` | 내가 속한 가족 목록 (가족 선택 화면) | ✅ |
| POST | `/families` | 가족 공간 만들기 `{ name, nickname }` (생성자 = OWNER) | ✅ |
| GET | `/families/:id` | 가족 상세 + 구성원 | ✅ |
| POST | `/families/:id/invites` | 초대 코드 발급 `{ expiresInDays? }` → `{ code, link }` | ✅ |
| POST | `/families/join` | 초대 코드로 참여 `{ code, nickname }` | ✅ |

### 예시
```bash
# 회원가입
curl -X POST localhost:3000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"mom@fam.com","password":"secret123","name":"김서연"}'

# 가족 만들기 (TOKEN = 위에서 받은 accessToken)
curl -X POST localhost:3000/api/families \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"서연이네 가족","nickname":"엄마"}'
```

## 데이터 모델 (Prisma)

- **User** — 계정 (email, password(bcrypt), name)
- **Family** — 가족 공간
- **Membership** — User↔Family (가족 내 호칭 `nickname`, 역할 `OWNER/ADMIN/MEMBER`)
- **Invite** — 초대 코드 (만료 가능)

## 구조
```
src/
  main.ts               부트스트랩 (전역 prefix /api, CORS, ValidationPipe)
  app.module.ts
  prisma/               PrismaService (전역 모듈)
  auth/                 회원가입·로그인·JWT 전략·가드·데코레이터
  families/             가족 공간 생성·목록·초대·참여
prisma/schema.prisma    데이터 모델
docker-compose.yml      로컬 PostgreSQL
```

## 다음 단계
- 카카오 OAuth 로그인
- 가족 사전(단어), 추억(사진·영상, 파일 업로드), 문답, 한마디 API
- 이미지/영상 스토리지 (S3 등)
