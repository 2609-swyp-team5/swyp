# Project Guide

## Tech Stack

### Backend
- Language : Java 21
- Framework : Spring Boot 4.1.1
- Database : PostgreSQL
- ORM: Spring Data JPA
- Cache/Messaging: Redis, Apache Kafka
- Build Tool: Gradle (Kotlin DSL)

### Frontend
- Language: TypeScript 5
- Framework: Next.js 16 (App Router)
- UI Library: React 19
- Styling: Tailwind CSS 4
- Lint/Format: ESLint 9 (eslint-config-next), Prettier

[//]: # (## Directory & Architecture Conventions) - 아직 기획중으로 주석처리

[//]: # ()
[//]: # (### Backend)

[//]: # (- `controllers`: API 엔드포인트 수신, 요청 파라미터 1차 검증 &#40;`@Valid`&#41;)

[//]: # (- `services`: 핵심 비즈니스 로직 &#40;트랜잭션 관리 및 도메인 흐름 제어&#41;)

[//]: # (- `repositories`: 데이터베이스 접근 인터페이스 &#40;JPA / DAO&#41;)

[//]: # (- `entities`: DB 스키마 맵핑 및 핵심 도메인 객체)

[//]: # (- `dtos`: Request/Response 데이터 전송 객체)

[//]: # (- `utils`:)

[//]: # (- `errors`:)

[//]: # ()
[//]: # (### Frontend)


## Coding Conventions

### Common
- 비밀번호, 토큰 키와 같은 민감한 데이터는 하드코딩하지 않고 환경 변수(`.env`, `application.yaml`)로 분리한다.
- API JSON 응답 및 Request는 `camelCase`를 기본으로 사용한다.
- 하나의 클래스/함수/컴포넌트는 단일 책임을 가지도록 명확히 분리한다.

### Backend
- Response DTO에 비밀번호 등 보안 민감 정보는 절대 포함하지 않는다.
- DTO 객체는 불변성을 가질 수 있도록 `record` 생성을 우선 고려한다.
- 에러 발생 시 단순 문자열 반환을 금지하고, 일관된 커스텀 예외 응답 객체(`ErrorResponse`)와 정교한 HTTP Status Code를 반환한다.
- NullPointerException 방지를 위해 `Optional`을 적절히 활용하고 Null 참조를 최소화한다.

### Frontend
- 모든 컴포넌트 및 함수는 TypeScript 타입을 명시하여 `any` 사용을 지양한다.
- 컴포넌트는 함수형 컴포넌트 스타일로 작성하며, 비즈니스 로직은 Custom Hook으로 분리한다.
- Props 및 상태 값은 불변성을 유지하도록 업데이트한다.
- 비동기 데이터 처리 시 로딩, 에러, 성공 상태를 UI에 명확히 표출한다.

## Commands

### Backend
- 애플리케이션 실행: `./gradlew bootRun`
- 전체 프로젝트 빌드: `./gradlew build`
- 전체 테스트 실행: `./gradlew test`
- 단일 테스트 실행: `./gradlew test --tests "*TestClass*"`

### Frontend
- 애플리케이션 실행 : `npm run dev`
- 프로젝트 빌드 : `npm run build`
- 코드 스타일, 린트 검사 : `npm run lint`

## Claude Role
- 코드 요청 시 설명은 간략하게 작성한다.
- 명시적 요청이 없는 한 코드 축약을 금지하며, 수정/생성된 전체 코드를 출력한다.
- 불필요한 인사말이나 서론 없이 본문/코드를 출력한다.
