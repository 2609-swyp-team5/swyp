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

## 배포 링크 (임시로 변경될 수 있음)

| 구분     | URL                                      |
|----------|------------------------------------------|
| Frontend | [링크](https://app.haru-dev.me/)         |
| Backend  | [링크](https://api.haru-dev.me/)         |
| API 문서 | [링크](https://app.haru-dev.me/api-docs) |

## 프로젝트 기간

2026.09.06 ~ 2026.10.17

## 팀 소개

**스위프 15기 5팀**

| 이름   | 역할     |
|--------|----------| 
| 한다현 | Design   | 
| 이흥준 | Backend  | 
| 지근영 | Backend  | 
| 신지훈 | Frontend |
| 김의현 | Frontend | 

## 기술 스택

**Backend**
- Java 21, Spring Boot 4.1.1 (Web MVC, Security, Validation, Actuator)
- Spring Data JPA + PostgreSQL(운영) / H2(로컬)
- Spring Data Redis
- Cloudflare R2 / AWS S3 / 네이버 클라우드 Object Storage
- springdoc-openapi (Swagger UI)
- Gradle (Kotlin DSL), Spotless

**Frontend**
- Next.js 16 (App Router), React 19
- TypeScript, Tailwind CSS 4
- ESLint, Prettier

**Infra**
- Docker Compose: PostgreSQL, pgAdmin, Redis, RedisInsight, Kafka, Kafka UI
- GitLab CI/CD: 테스트 → 빌드 → 배포, Gemini 기반 MR 자동 코드 리뷰

## 프로젝트 구조

```
.
├── backend/                             # Spring Boot 애플리케이션
│   ├── src/main/java/com/swyp/team5/
│   │   ├── common/                      # 공통 설정, 예외 처리, 필터
│   │   └── file/                        # 파일 스토리지(R2/S3/Naver/Local) 추상화
│   ├── src/main/resources/
│   │   ├── application-local.yaml       # 로컬 개발 프로파일 설정 (H2 등)
│   │   ├── application-dev.yaml         # 개발 서버 프로파일 설정
│   │   ├── application-prod.yaml        # 운영 프로파일 설정
│   │   └── logback-spring.xml           # 프로파일별 로깅 설정
│   ├── src/test/
│   ├── build.gradle.kts
│   └── Dockerfile
├── frontend/                 # Next.js 애플리케이션
│   ├── app/                  # App Router 페이지
│   ├── public/
│   └── package.json
├── docs/                     # 설계 문서, 컨벤션, 가이드
├── docker-compose.yml        # 로컬 개발용 인프라(PostgreSQL, Redis, Kafka 등)
└── .gitlab-ci.yml            # CI/CD 파이프라인 정의
```

## CI/CD

Merge Request가 열리면 다음이 자동 실행됩니다.

- `backend-test` / `backend-build`: `backend/**` 변경 시 테스트와 빌드
- `frontend-test` / `frontend-build`: `frontend/**` 변경 시 타입 체크, 린트, 포맷 검사와 빌드
- `code-review`: Gemini CLI 기반 자동 코드 리뷰를 MR 코멘트로 등록

