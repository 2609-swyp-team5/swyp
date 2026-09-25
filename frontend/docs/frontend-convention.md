# 프론트엔드 컨벤션

> 이 문서는 현재 `frontend/` 코드에 적용되는 규칙을 정리한다.
> 아직 도입하지 않은 아키텍처(OpenAPI 자동 생성 등)는 이 문서에 적지 않는다.
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
│   │   ├── providers/              # QueryProvider 등 공통 Provider
│   │   └── lib/
│   │       ├── api/                 # Axios 클라이언트와 API 타입·오류 처리
│   │       └── utils.ts             # 공통 유틸리티
│   ├── features/
│   │   ├── auth/                    # 인증 도메인
│   │   │   ├── api/                 # 인증 HTTP 요청과 응답 처리
│   │   │   ├── components/          # AuthInitializer, GoogleLoginButton
│   │   │   ├── hooks/
│   │   │   │   ├── mutations/       # 로그인·회원가입·소셜 로그인 요청 훅
│   │   │   │   └── queries/         # 조회 훅 위치 (현재 .gitkeep만 있음)
│   │   │   ├── schemas/             # React Hook Form에 연결하는 Zod 스키마
│   │   │   ├── store/               # 전역 인증 상태·복원·재발급·로그아웃
│   │   │   └── types.d.ts           # 인증 요청·응답 타입
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
| 앱 전체에 컨텍스트를 제공하는 Provider인가?  | `src/common/providers/`      |
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
- 인증 요청·응답은 `SignUpRequest`, `SignUpResponse`, `LoginRequest`, `LoginResponse`, `SocialLoginRequest`, `TokenResponse`로 구분한다.
- 회원가입 요청의 `phone`은 `string | null`이고, 응답 타입은 회원 식별자·이메일·닉네임·이름·전화번호·역할·상태를 포함한다. 로그인·소셜 로그인·재발급 응답의 액세스 토큰은 `accessToken`으로 받는다.

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
- 현재 인증 API는 `src/features/auth/api/authApi.ts`에서 `authApi.authLogin`, `authApi.authSignUp`, `authApi.authSocialLogin`, `authApi.authLogout`, `authApi.authRefresh`로 제공한다.
- 공통 응답 타입은 `src/common/lib/api/types.d.ts`의 `ApiResponse<T>`를 사용한다.
- 오류 메시지 변환은 `src/common/lib/api/error.ts`의 `getApiErrorMessage`를 사용한다. Axios의 시간 초과·HTTP·네트워크 오류와 일반 `Error`의 메시지를 처리한다.

### 인증 API의 반환값

- `authLogin`, `authSignUp`, `authSocialLogin`은 성공 시 응답 본문의 `data`만 반환한다. 반환 타입은 각각 `LoginResponse`, `SignUpResponse`, `TokenResponse`다.
- 세 함수는 HTTP 오류를 그대로 전파하고, HTTP 요청이 성공해도 `success: false`이면 메시지를 담은 `Error`를 던진다. Mutation이 실패로 인식하도록 오류를 정상 반환값으로 바꾸지 않는다.
- `authLogout`, `authRefresh`는 아직 `AxiosResponse<ApiResponse<T>>`를 반환한다. 스토어에서 `result.data.success`를 확인한다. 모든 인증 API의 반환 구조가 같다고 가정하지 않는다.

### TanStack Query와 요청 훅

- `src/common/providers/QueryProvider.tsx`에서 QueryClient를 생성하고 루트 `app/layout.tsx`에 연결한다.
- 조회 훅은 `features/{도메인}/hooks/queries/`, 변경 요청 훅은 `features/{도메인}/hooks/mutations/`에 둔다. 테스트는 대상 훅 옆에 둔다.
- 현재 `useLoginMutation`, `useSignUpMutation`, `useSocialLoginMutation`이 API 함수를 `mutationFn`으로 직접 사용한다. 세 Mutation 모두 `retry: false`다.
- 일반·소셜 로그인 성공 시 훅에서 `setAccessToken`을 호출한다. 회원가입 성공 시에는 페이지의 콜백으로 성공 메시지 표시와 폼 초기화를 수행한다.
- 페이지에서 훅에 `onError` 콜백을 전달하고 `getApiErrorMessage`로 오류를 표시한다. 폼 입력·검증·페이지 이동은 페이지에 유지한다.
- 전역 인증 상태는 Zustand가 담당한다. React Query가 토큰 저장이나 로그인 복원을 대신하지 않는다.

현재 인증 기능의 역할 분리는 다음과 같다.

| 위치                                 | 담당                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `app/(auth)`                         | 폼 입력·검증, 성공·오류 메시지 표시, 페이지 이동     |
| `features/auth/hooks/mutations`      | API 함수 연결, 요청 상태, 성공 처리와 화면 콜백 전달 |
| `features/auth/api/authApi.ts`       | HTTP 요청과 응답 처리                                |
| `features/auth/store/authStore.ts`   | 전역 인증 상태, 토큰 저장·복원·재발급·로그아웃       |
| `common/lib/api/client.ts`           | 쿠키 전송, 인증 헤더, 401 재요청                     |
| `common/providers/QueryProvider.tsx` | 앱 전체에서 사용할 QueryClient 제공                  |

### 인증 복원과 재요청

- `authStore.ts`는 `accessToken`, `isLoggedIn`, `isInitialized`를 관리한다. 액세스 토큰은 메모리에만 저장하며 localStorage/sessionStorage에 저장하지 않는다.
- 루트의 `AuthInitializer`가 마운트되면 `checkStatus()`를 호출한다. 초기화 전이면 `authRefresh()`로 쿠키 기반 복원을 시도하고, 실패해도 초기화는 완료한다.
- Axios는 `withCredentials: true`, 10초 타임아웃을 사용하고 저장된 액세스 토큰을 Bearer 헤더에 넣는다.
- 인증 헤더가 있는 요청의 401은 토큰 재발급 후 재요청한다. `_retry`로 반복 재시도를 막고, `refreshPromise`로 동시 재발급을 공유한다.
- `/auth/login`, `/auth/signup`, `/auth/social/login`, `/auth/refresh`는 401 재발급 대상에서 제외한다. Mutation의 `retry: false`와 Axios의 401 재요청은 별도 동작이다.
- `authVersion`과 토큰 비교로 재발급 중 발생한 로그인·로그아웃을 이전 응답이 덮어쓰지 않게 한다.
- `ROUTES`에서 현재 인증 필수 경로는 `/my`이며 하위 경로도 포함한다. 초기화 후 비로그인 상태이면 `/login`으로 이동하고, `/my` 레이아웃도 인증 전 콘텐츠를 숨긴다.
- 로그아웃은 스토어와 `SiteHeader`에서 처리하며 아직 Mutation으로 옮기지 않았다.
- 일반·소셜 로그인 요청은 스토어가 직접 호출하지 않는다. Mutation 성공 시 `setAccessToken()`으로 토큰과 로그인 상태를 함께 갱신한다.
- 로그인 페이지는 인증 초기화 전 또는 이미 로그인한 상태에서 폼을 숨기며, 로그인 확인 후 `/`로 이동한다. 공개 화면의 시작하기와 헤더도 같은 스토어 상태를 사용한다.
- 헤더는 비로그인 시 로그인 링크, 로그인 시 프로필·로그아웃 UI를 표시한다. 로그아웃 성공 시 상태를 지우고, 일반적인 요청 실패 시 상태를 유지하며 오류를 표시한다.
- Zustand DevTools는 개발 환경에서만 활성화한다.

### 구글 로그인

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`와 `NEXT_PUBLIC_API_URL`을 사용한다.
- `GoogleLoginButton`은 `GoogleOAuthProvider`와 공식 버튼을 표시하고, ResizeObserver로 부모 너비를 측정해 최대 400px로 맞춘다.
- 로그인 페이지는 `response.credential`을 `{ provider: "GOOGLE", token }`으로 Mutation에 전달한다. Client ID를 인증 토큰으로 보내지 않는다.
- 타입에는 `GOOGLE`, `KAKAO`, `NAVER`가 있지만 현재 화면에 연결된 소셜 로그인은 구글이다.

현재 `http` 래퍼와 OpenAPI 자동 생성 타입은 사용하지 않는다.

## 6. 스타일 규칙

- Tailwind CSS v4를 사용한다.
- 전역 토큰과 공통 CSS는 `src/app/globals.css`에 둔다.
- 전역 레이아웃은 `.layout-container`, `.layout-grid`를 사용하고, 타이포그래피는 `typography-heading-01`~`03`, `typography-body-large`~`small` 클래스를 사용한다.
- 기본 본문은 Inter를 사용하고, 브랜드·푸터 문구에는 `font-brand` 또는 `typography-footer`를 사용한다.
- 현재 기준 그리드는 데스크톱 8열/20px gutter/112px margin, 태블릿 6열/20px gutter/112px margin, 모바일 2열/5px gutter/40px margin이다.
- 클래스 조합은 `@/common/lib/utils`의 `cn`을 사용한다.
- 공통 버튼 변형은 `Button.tsx`의 CVA 설정에서 관리한다.
- Prettier 설정을 따른다: 4칸 들여쓰기, 큰따옴표, 세미콜론, trailing comma, LF.
- Tailwind 클래스 순서는 `prettier-plugin-tailwindcss`에 맡긴다.

### shadcn/ui

- Shadcn 컴포넌트 추가는 `npx shadcn@latest add`를 직접 실행하지 않고 `npm run ui:add -- {component}`를 사용한다.
- `ui:add`는 Shadcn CLI를 실행한 뒤 UI 컴포넌트 파일명을 PascalCase로 정리하고, 관련 import 경로를 함께 수정한다.
- Shadcn 컴포넌트의 `cn` import는 `@/common/lib/utils`로 통일한다. `cn` 유틸은 `src/common/lib/utils.ts`에만 둔다.
- Shadcn 컴포넌트는 추가 후 프로젝트 코드로 간주하고 필요한 만큼 Tailwind 클래스와 CVA 변형을 수정한다.
- 커스터마이징한 컴포넌트는 기존 변경을 덮어쓸 수 있으므로 같은 컴포넌트를 CLI로 다시 추가하지 않는다.
- 로그인·회원가입은 `Button`, `Input`, `Label`, `Card`를 사용한다. 화면별 높이·모서리·여백은 페이지의 `className`에 직접 지정한다.
- 구글 공식 버튼은 공통 `Button` 대신 인증 도메인의 `GoogleLoginButton`으로 분리한다.

## 7. 폼 / 검증

- 폼 상태와 제출 처리는 `react-hook-form`을 기본으로 사용한다.
- 필드 검증 규칙은 `zod` 스키마로 정의하고, `@hookform/resolvers/zod`의 `zodResolver`로 React Hook Form과 연결한다.
- 상품 등록, 회원가입, 어드민 프롬프트 등록처럼 필드가 많거나 단계가 있는 폼에 우선 적용한다.
- 스키마는 사용하는 도메인의 `features/{도메인}/schemas/`에 둔다. 여러 도메인에서 공유하는 규칙만 `common`으로 올린다.
- API 요청 데이터와 응답 데이터의 검증이 필요할 때 같은 Zod 스키마를 활용한다. 현재 백엔드와 스키마를 자동으로 공유하는 구조는 아니므로, 공유가 필요해지면 별도 패키지나 생성 방식을 먼저 합의한다.
- 실제 폼을 도입할 때 필요한 의존성은 `react-hook-form`, `@hookform/resolvers`, `zod`다. 사용하지 않는 화면에 미리 추가하지 않는다.
- 로그인·회원가입은 `features/auth/schemas/authSchema.ts`의 스키마와 `zodResolver`를 사용한다. 필드 오류는 입력란 아래에 표시한다.
- `mutate()` 호출은 요청 완료까지 기다리지 않으므로 네트워크 진행 상태는 Mutation의 `isPending`으로 확인한다. 현재 폼은 `formState.isSubmitting`과 `isPending`을 합쳐 입력·제출 버튼을 비활성화하고, 로그인은 소셜 Mutation의 진행 상태도 포함한다.
- 폼 전용 `useLoginForm`·`useSignupForm`은 사용하지 않는다. 폼 검증·표시는 페이지, API 요청 상태는 Mutation 훅이 담당한다.
- 로그인은 이메일 형식과 필수 입력을 검사한다. 회원가입은 백엔드 DTO의 비밀번호·이름·닉네임·휴대폰 규칙을 반영한다. 비밀번호를 임의로 trim하지 않고, 선택 휴대폰 번호의 빈 문자열은 `null`로 변환한다. 최종 검증은 서버에서도 수행한다.
- 현재 회원가입 비밀번호는 영문·숫자를 포함한 8~64자, 이름은 필수·최대 50자, 닉네임은 필수·최대 30자다. 휴대폰은 선택 입력이며 하이픈 없는 형식을 검사한다.
- 입력 오류는 `aria-invalid`와 `aria-describedby`로 연결한다. 회원가입 성공 시 성공 메시지를 표시하고 `reset()`으로 폼을 초기화하며, 자동 로그인은 수행하지 않는다.

## 8. 아이콘 / 애니메이션

- 아이콘은 `lucide-react`를 기본으로 사용한다. 현재 프로젝트의 shadcn/ui 컴포넌트와 함께 사용할 수 있고, 아이콘의 크기·색상은 Tailwind 클래스로 조정한다.
- 장식용 아이콘에는 `aria-hidden="true"`를 사용하고, 의미를 전달하는 아이콘 버튼에는 `aria-label`을 제공한다.
- Figma에만 존재하는 브랜드 아이콘이나 외부 플랫폼 로고처럼 Lucide로 대체할 수 없는 경우에만 별도 SVG·이미지를 사용한다.
- 모달, 토스트, 페이지 전환처럼 상태 변화가 있는 애니메이션에는 `framer-motion`을 사용한다.
- 단순한 hover, 색상, opacity, 짧은 크기 변화는 Tailwind의 `transition-*` 클래스를 우선 사용한다.
- 애니메이션은 콘텐츠 이해를 방해하지 않도록 최소화하고, `prefers-reduced-motion` 환경을 고려한다.
- 실제 애니메이션을 도입할 때 필요한 의존성은 `framer-motion`이며, 사용하지 않는 화면에 미리 추가하지 않는다.

## 9. 테스트 규칙

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

## 10. 변경 시 확인 사항

- 새 코드가 `app`, `common`, `features` 중 올바른 위치에 있는가?
- 컴포넌트 파일 이름이 PascalCase인가?
- 클라이언트 컴포넌트 범위가 필요한 만큼만 좁혀져 있는가?
- API 호출이 도메인 API 모듈을 거치는가?
- 동작 변경에 맞는 단위 테스트 또는 E2E 테스트가 있는가?
- 구조나 도구를 바꿨다면 이 문서도 함께 갱신했는가?

## 11. 마이페이지 UI

- 회원 조회는 `features/member/api/memberApi.ts`의 `memberMe`와 `hooks/queries/useMeQuery.ts`에서 처리한다. 인증 초기화 후 로그인 상태일 때 `/users/me`를 조회하며, `["member", "me"]` 캐시를 공유한다. 마이페이지 홈 인사말과 사이드바 이름·기본 아바타 글자는 실제 응답의 nickname을 사용한다. 로그아웃·인증 만료 시 AuthInitializer에서 회원 조회를 취소하고 캐시를 제거한다.
- `/my`, `/my/settings`, `/my/password`, `/my/notifications`, `/my/products`, `/my/platforms`, `/my/withdraw`는 공통 `MySidebar`와 `MyPageContent`를 사용한다.
- 화면 예시 데이터는 `features/my/myPreviewData.ts`에 둔다. 새 화면의 입력·사진 미리보기·알림 토글·상품 필터·연결 확인은 UI 상태만 변경하며 API를 호출하거나 영구 저장하지 않는다.
- 기존 로그인 접근 제한과 로그아웃 mutation은 유지한다. 로그아웃은 회원 탈퇴 아래에 배치한다. 비밀번호 변경은 기존 비밀번호와 변경할 비밀번호 입력 UI만 제공하며 실제 변경 API는 호출하지 않는다.
- 첫 번째 마이페이지 디자인을 기준으로 제목은 기존 `--type-heading-03-size`(30px), 사이드바는 `--type-body-medium-size`(20px), 본문·입력은 16px, 보조 문구는 13px로 통일한다. 색상은 `primary`, `foreground`, `muted-foreground`, `border`, `destructive` 등 기존 토큰을 우선 사용한다.
- 알림과 상품 표에는 공통 `Switch`, `Table`을 사용하고, 패널은 공통 `Card`를 조합한 `MyPanel`을 사용한다.

- 회원 탈퇴는 동의 및 확인 후 `memberApi.memberWithdraw`로 `DELETE /users/me`를 요청한다. 성공 시 인증 상태를 초기화하고 기존 AuthInitializer가 회원 캐시 정리와 로그인 화면 이동을 처리한다. 실패 시 인증 상태를 유지하고 확인 모달에 오류를 표시한다. 백엔드는 회원 상태를 DELETED로 변경하고 refresh 토큰·쿠키를 정리한다.
