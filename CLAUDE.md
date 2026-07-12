# CLAUDE.md

이 저장소에서 작업할 때 따르는 규칙입니다.

## 커밋 메시지 규칙 (Conventional Commits)

형식: `<type>: <설명>`

- **type은 영문 소문자**, **설명은 한국어**로 작성합니다.
- 제목은 명령형/요약형으로 간결하게 (마침표 없이).
- 필요하면 본문에 `-` 목록으로 변경 사항을 정리합니다.

### type 종류

| type | 용도 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `docs` | 문서 수정 (README, 주석 등) |
| `style` | 포맷/세미콜론 등 동작에 영향 없는 변경 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정/의존성 등 잡무 |

### 예시

```
feat: 카카오 소셜 로그인 추가

- GET /auth/kakao: 카카오 인증 화면으로 리다이렉트
- GET /auth/kakao/callback: 인가 코드 → 토큰 교환 → 유저 조회/생성 → JWT 발급
- User 엔티티에 provider/providerId 추가, 소셜 유저용 password nullable 처리
```

```
fix: 카카오 토큰 교환 시 client_secret 누락 수정
```
