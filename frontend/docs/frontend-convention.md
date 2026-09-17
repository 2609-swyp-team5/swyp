# 프론트엔드 컨벤션

> 이 문서는 현재 `frontend/` 코드에 적용되는 규칙을 정리한다.
> 아직 도입하지 않은 아키텍처(TanStack Query, OpenAPI 자동 생성 등)는 이 문서에 적지 않는다.
> 구조나 도구를 변경하면 코드와 이 문서를 함께 갱신한다.

## 1. 기본 구조

- 소스 코드는 `frontend/src/` 아래에 둔다.
- `src/app/`은 Next.js App Router의 라우팅, 레이아웃, 화면 조립을 담당한다.
- `src/common/`은 도메인과 무관하게 여러 화면에서 사용하는 코드를 둔다.
- `src/features/{도메인}/`은 도메인 전용 컴포넌트, API, 훅, 상태, 타입을 둔다.
- `src/constants/`는 앱 전역에서 공유하는 고정값을 둔다.
- `frontend/docs/`는 프론트엔드 문서를 둔다.

현재 구조는 다음과 같다.

```text
frontend/
├── src/
│   ├── app/                         # App Router 라우트와 레이아웃
│   │   ├── (public)/                # 비로그인 공개 화면
│   │   ├── (auth)/                  # 로그인·회원가입 화면
│   │   ├── (main)/                  # 서비스 화면
│   │   ├── layout.tsx               # 루트 레이아웃
│   │   └── globals.css              # 전역 스타일과 디자인 토큰
│   ├── common/
│   │   ├── components/
│   │   │   ├── layout/              # SiteHeader, SiteFooter 등
│   │   │   └── ui/                  # Button 등 공통 UI
│   │   └── lib/
│   │       ├── api/                 # Axios 클라이언트와 API 타입·오류 처리
│   │       └── utils.ts             # 공통 유틸리티
│   ├── features/
│   │   ├── auth/                    # 인증 도메인
│   │   └── my/                      # 마이페이지 도메인
│   └── constants/                   # routes.ts 등 전역 상수
├── public/
├── docs/
└── 설정 파일
```

### 어디에 둘지 판단 기준

| 질문                                         | 위치                         |
| -------------------------------------------- | ---------------------------- |
| URL이 필요한 화면인가?                       | `src/app/{segment}/page.tsx` |
| 특정 도메인에서만 사용하는가?                | `src/features/{도메인}/`     |
| 여러 도메인이 공유하는 UI인가?               | `src/common/components/`     |
| React와 무관한 유틸리티·외부 클라이언트인가? | `src/common/lib/`            |
| 앱 전역 고정값인가?                          | `src/constants/`             |

`components.json`의 shadcn 별칭도 현재 구조에 맞춰 `@/common/components`,
`@/common/lib`를 사용한다.

## 2. App Router 규칙

- `page.tsx`, `layout.tsx` 등 Next.js가 정한 파일 이름을 사용한다.
- 라우트 그룹은 URL에 노출되지 않는 소문자 괄호 형식으로 작성한다. 예: `(auth)`, `(main)`.
- `page.tsx`의 기본 export는 해당 라우트 컴포넌트로 둔다.
- `layout.tsx`는 공통 레이아웃과 자식 화면 배치만 담당한다.
- 서버 컴포넌트를 기본으로 하고, `useState`, `usePathname`, 브라우저 API 등 클라이언트 기능이 필요한 파일에만 `"use client"`를 선언한다.
- `"use client"` 컴포넌트는 `async` 컴포넌트로 만들지 않는다.
- 내부 이동은 `<a>` 대신 `next/link`를 사용한다.
- 이미지를 추가할 때는 일반 `<img>` 대신 `next/image`를 사용한다.

현재 `SiteHeader`, `MySidebar`, 로그인·회원가입 화면은 상태 또는 `usePathname`을 사용하므로 클라이언트 컴포넌트다.

## 3. 네이밍 규칙

| 대상          | 규칙                        | 예                                    |
| ------------- | --------------------------- | ------------------------------------- |
| 컴포넌트 파일 | `PascalCase.tsx`            | `Button.tsx`, `SiteHeader.tsx`        |
| 컴포넌트 이름 | `PascalCase`                | `Button`, `SiteHeader`                |
| 훅 파일       | `use` 접두사 + camelCase    | `useItemList.ts`                      |
| 일반 모듈     | camelCase                   | `authApi.ts`, `client.ts`, `error.ts` |
| API 모듈      | 현재 도메인명 + `Api`       | `authApi.ts`                          |
| 타입 파일     | `types.d.ts`                | `features/auth/types.d.ts`            |
| 상수 파일     | camelCase                   | `routes.ts`                           |
| 상수 값       | `SCREAMING_SNAKE_CASE`      | `HEADER_LINKS`                        |
| 폴더          | 소문자 kebab-case           | `common/components`, `buy/wishlist`   |
| 라우트 그룹   | 소문자 괄호 형식            | `(auth)`, `(main)`                    |
| 단위 테스트   | 대상 파일 옆 `*.test.ts(x)` | `page.test.tsx`                       |
| E2E 테스트    | `frontend/e2e/*.spec.ts`    | `login.spec.ts`                       |

### 타입 파일

현재 `features/auth/types.d.ts`와 `common/lib/api/types.d.ts`는 `export`를 사용하는 일반 타입 모듈이다.

- 도메인 타입과 API 응답 타입은 `types.d.ts`에 둔다.
- 반드시 `export`를 사용해 모듈로 유지한다. export가 없는 전역 선언 파일로 사용하지 않는다.
- 런타임 값이나 함수를 함께 정의해야 하는 파일은 `types.d.ts`가 아니라 일반 `.ts` 파일로 분리한다.

`authApi.ts`를 `auth.api.ts`로 바꿔야 하는 규칙도 없다. 현재 프로젝트에서는 `authApi.ts`와 `types.d.ts`를 사용한다.

## 4. Import 규칙

- `@/*` 별칭을 사용한다. `@/*`는 `src/*`를 가리킨다.
- 여러 단계의 상대경로(`../../..`)는 사용하지 않는다.
- 같은 도메인 안의 가까운 타입 import처럼 의미가 분명한 상대경로는 허용한다. 예: `features/auth/api/authApi.ts`에서 `../types`.
- 타입만 import할 때는 `import type`을 사용한다.
- 공통 UI는 실제 파일 경로로 import한다. 예: `@/common/components/ui/Button`.
- 현재는 과도한 배럴(`index.ts`)을 만들지 않는다. 외부 공개 API가 필요해질 때 도메인 경계에서만 도입한다.

## 5. API 통신 규칙

- 공개 API 베이스 URL은 `NEXT_PUBLIC_API_URL`을 사용한다.
- 비밀값은 `NEXT_PUBLIC_` 환경변수에 넣지 않는다.
- Axios 인스턴스는 `src/common/lib/api/client.ts`에서 관리한다.
- 컴포넌트에서 Axios를 직접 호출하지 않고, 도메인 API 모듈을 거친다.
- 현재 인증 API는 `src/features/auth/api/authApi.ts`에서 `authApi.login`, `authApi.signUp`으로 제공한다.
- 공통 응답 타입은 `src/common/lib/api/types.d.ts`의 `ApiResponse<T>`를 사용한다.
- Axios 오류 메시지 변환은 `src/common/lib/api/error.ts`의 `getApiErrorMessage`를 사용한다.

현재 프로젝트에는 TanStack Query, `http` 래퍼, OpenAPI 자동 생성 타입을 사용하지 않는다. 도입할 때는 의존성·폴더 구조·API 규칙을 함께 정하고 이 문서를 갱신한다.

## 6. 스타일 규칙

- Tailwind CSS v4를 사용한다.
- 전역 토큰과 공통 CSS는 `src/app/globals.css`에 둔다.
- 클래스 조합은 `@/common/lib/utils`의 `cn`을 사용한다.
- 공통 버튼 변형은 `Button.tsx`의 CVA 설정에서 관리한다.
- Prettier 설정을 따른다: 4칸 들여쓰기, 큰따옴표, 세미콜론, trailing comma, LF.
- Tailwind 클래스 순서는 `prettier-plugin-tailwindcss`에 맡긴다.

## 7. 테스트 규칙

- 단위·컴포넌트 테스트는 Vitest와 React Testing Library를 사용한다.
- API mocking은 MSW를 사용한다.
- 테스트는 구현 세부사항보다 사용자가 확인하는 동작을 검증한다.
- 요소는 `getByRole`과 `getByLabelText`를 우선 사용한다.
- 클릭과 입력은 `userEvent`를 사용한다.
- 비동기 검증은 임의의 sleep 대신 `findBy*`, `waitFor`, Playwright web-first assertion을 사용한다.
- 핵심 사용자 흐름은 Playwright E2E로 검증한다.

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test:run
npm run test:e2e
```

## 8. 변경 시 확인 사항

- 새 코드가 `app`, `common`, `features` 중 올바른 위치에 있는가?
- 컴포넌트 파일 이름이 PascalCase인가?
- 클라이언트 컴포넌트 범위가 필요한 만큼만 좁혀져 있는가?
- API 호출이 도메인 API 모듈을 거치는가?
- 동작 변경에 맞는 단위 테스트 또는 E2E 테스트가 있는가?
- 구조나 도구를 바꿨다면 이 문서도 함께 갱신했는가?
