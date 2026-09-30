# 지금이니?

**집에 있는 물건과 사고 싶은 물건을 등록해두면, AI가 중고 시세·가격 변화·감가상각·거래 데이터를 분석해
"지금 팔지 / 더 가지고 있을지", "지금 살지 / 기다릴지"를 알려주는 서비스**입니다.

## 핵심 기능

- **물건 등록** — 보유 중인 물건과 사고 싶은 물건을 각각 등록
- **중고 시세 분석** — 여러 플랫폼의 가격 데이터를 기반으로 평균가·최근 가격·가격 변동, 유사 모델·이전 세대 가격까지 비교
- **감가 예측 & 지금 팔기/기다리기 판단** — 시간 경과에 따른 예상 가격 하락을 계산해 AI가 판매/구매 타이밍을 추천
- **적정 흥정가 추천** — 구매 희망 물건에 대해 현재 매물가와 과거 거래가를 비교해 제안 가능한 가격을 안내
- **목표 가격 알림** — 사용자가 설정한 목표 판매가/구매가에 도달하면 알림

## 스크린샷 / 데모

[예시 화면명] — 주요 화면 캡처나 데모 GIF 추가

## 배포 링크

| 구분               | URL                                                                        |
| ------------------ | -------------------------------------------------------------------------- |
| Frontend           | [https://jigeumini.live](https://jigeumini.live)                           |
| Backend            | [https://api.jigeumini.live](https://api.jigeumini.live)                   |
| API 문서 (Swagger) | [https://api.jigeumini.live/api-docs](https://api.jigeumini.live/api-docs) |

## 프로젝트 기간

2026.09.06 ~ 2026.10.17

## 팀 소개

**스위프 15기 5팀**

| 이름   | 역할     |
| ------ | -------- |
| 한다현 | Design   |
| 이흥준 | Backend  |
| 지근영 | Backend  |
| 신지훈 | Frontend |
| 김의현 | Frontend |

## 기술 스택

**Backend**

- Java 21, Spring Boot 4.1.1
- Spring Data JPA + PostgreSQL (Neon), Flyway
- Spring Data Redis (Upstash)
- Spring AI (Gemini, 실패 시 OpenAI GPT 대체)
- Playwright for Java (번개장터 매물 자동 등록)
- Cloudflare R2
- springdoc-openapi (Swagger UI)
- Gradle (Kotlin DSL), Spotless

**Frontend**

- Next.js 16 (App Router), React 19
- TypeScript, Tailwind CSS 4
- ESLint, Prettier
- Vitest, React Testing Library, MSW
- Playwright

**Infra**

- DB는 Neon(PostgreSQL), Redis는 Upstash 클라우드를 사용
- Docker Compose(로컬 도구): pgAdmin, RedisInsight, Kafka, Kafka UI
- GitLab CI/CD: 테스트 → 빌드(배포 잡은 현재 비활성), Gemini API 기반 MR 자동 코드 리뷰

## 프로젝트 구조

```
.
├── backend/                             # Spring Boot 애플리케이션
│   ├── src/main/java/com/swyp/team5/
│   │   ├── auth/                        # 회원가입·로그인·토큰 재발급·로그아웃
│   │   ├── social/                      # 소셜 로그인(구글·카카오·네이버)
│   │   ├── member/                      # 회원 엔티티·내 정보
│   │   ├── product/                     # 상품 등록(SSE)·수정·조회·상태 변경
│   │   ├── category/ tag/ component/    # 카테고리(번개장터 체계)·태그·구성품
│   │   ├── productanalysis/             # 시세 분석 배치·추천(SELL/HOLD/BUY/WAIT)
│   │   ├── crawl/                       # 번개장터 시세 매물 수집·재확인 배치
│   │   ├── platform/                    # 외부 플랫폼 연동·수집 매물·자동 등록
│   │   ├── interest/                    # 관심상품·목표가
│   │   ├── notification/                # 알림
│   │   ├── search/                      # 인기 검색어·인기 상품
│   │   ├── common/                      # 공통 설정, 예외 처리, 필터, AI 호출
│   │   └── file/                        # 파일 스토리지(R2/S3/Naver/Local) 추상화
│   ├── src/main/resources/
│   │   ├── db/migration/                # Flyway 마이그레이션(V1~)
│   │   ├── application-local.yaml       # 로컬 개발 프로파일 설정 (Neon swyp-local 브랜치)
│   │   ├── application-dev.yaml         # 개발 서버 프로파일 설정
│   │   ├── application-prod.yaml        # 운영 프로파일 설정
│   │   └── logback-spring.xml           # 프로파일별 로깅 설정
│   ├── src/test/
│   ├── build.gradle.kts
│   └── Dockerfile
├── frontend/                 # Next.js 애플리케이션
│   ├── src/app/              # App Router 페이지
│   ├── src/features/         # 기능별 화면·API·상태
│   ├── tests/                # 공용 단위·컴포넌트 테스트 설정과 mock
│   ├── e2e/                  # Playwright E2E 테스트
│   ├── docs/
│   │   ├── frontend-convention.md  # 프론트엔드 코드 컨벤션
│   │   └── testing-guide.md        # 프론트엔드 테스트 가이드
│   ├── vitest.config.ts      # Vitest 설정
│   ├── playwright.config.ts  # Playwright 설정
│   ├── public/
│   └── package.json
├── docker-compose.yml        # 로컬 개발용 도구(pgAdmin, RedisInsight, Kafka 등)
└── .gitlab-ci.yml            # CI/CD 파이프라인 정의
```

## 테스트

프론트엔드 테스트는 `frontend/`에서 실행합니다.

```bash
cd frontend

# 개발 중 watch 모드
npm run test

# 단위·컴포넌트 테스트 전체 1회 실행
npm run test:run

# 특정 테스트 파일만 실행
npm run test:run -- app/page.test.tsx

# E2E 테스트 실행
npm run test:e2e
```

단위·컴포넌트 테스트는 Vitest와 React Testing Library를 사용하고, API mocking에는 MSW를 사용합니다. E2E 테스트는 Playwright로 회원가입·로그인·결제·알림 등 핵심 사용자 흐름을 우선 검증합니다. 코드 구조와 네이밍은 [`frontend/docs/frontend-convention.md`](frontend/docs/frontend-convention.md), 테스트 작성법은 [`frontend/docs/testing-guide.md`](frontend/docs/testing-guide.md)를 참고해 주세요.

## CI/CD

Merge Request가 열리거나 MR이 없는 브랜치에 push하면 변경된 쪽 잡만 자동 실행됩니다(기능 브랜치 push는 `develop` 대비 변경 기준).

- `backend-test` / `backend-build`: `backend/**` 변경 시 테스트와 빌드
- `frontend-test`: `frontend/**` 변경 시 타입 체크, 린트, 포맷 검사와 단위·컴포넌트 테스트
- `frontend-e2e`: `frontend/**` 변경 시 Playwright E2E 테스트
- `frontend-build`: `frontend/**` 변경 시 Next.js 빌드
- `code-review`: MR 전용. diff를 Gemini API로 직접 보내 리뷰 결과를 MR 코멘트로 등록(요청당 120초·최대 2회 재시도, 잡 제한 10분)
