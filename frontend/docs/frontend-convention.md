# 프론트엔드 컨벤션

> "지금이니?" 프론트엔드(`frontend/`)의 폴더 구조·경로 별칭·네이밍 규칙.
> 개발 착수 전 공통 세팅 1순위 ① 항목. 변경 시 이 문서를 먼저 갱신하고 PR 리뷰에서 합의한다.

최초 작성: 2026-09-10

> 참고: 프론트엔드 관련 문서는 `frontend/docs/` 하위에 모은다. 테스트 작성법은
> `frontend/docs/testing-guide.md`를 참고한다.

---

## 1. 기본 방침

- **`src/` 디렉터리 사용.** 설정 파일(루트)과 소스 코드(`src/`)를 분리한다.
- **기능(도메인) 중심 배치.** 도메인 하나에 딸린 컴포넌트·훅·API·타입을 `features/{도메인}/` 한 곳에 모은다.
- **`app/` 는 라우팅·화면 조립만.** 데이터 패칭·비즈니스 로직은 `features/` 의 훅/함수로 내려보낸다.
- **공통(도메인 무관) UI 는 `src/components/`**, 순수 유틸·외부 클라이언트는 `src/lib/`.

## 2. 폴더 구조

```
frontend/
├── src/
│   ├── app/                  # App Router — 라우팅 전용
│   │   ├── (auth)/           # 비로그인 라우트 그룹 (로그인/회원가입)      ※ 인증 작업에서 생성
│   │   ├── (main)/           # 로그인 후 서비스 라우트 그룹               ※ 인증 작업에서 생성
│   │   ├── layout.tsx        # 루트 레이아웃 (html/body, 폰트, Provider)
│   │   ├── providers.tsx     # 클라이언트 Provider 모음 (QueryClientProvider 등)
│   │   ├── globals.css
│   │   ├── loading.tsx / error.tsx / not-found.tsx  # 라우트별 규약
│   │   └── {segment}/page.tsx
│   │
│   ├── components/           # 도메인 무관 공통 컴포넌트
│   │   ├── ui/               # 원자적 UI 프리미티브 (Button, Input, Modal, Toast, Spinner ...)
│   │   └── layout/           # Header, Footer, Nav, 페이지 셸 등 레이아웃 조각
│   │
│   ├── features/             # 도메인별 모듈 (README.md 참고)
│   │   └── {도메인}/
│   │       ├── components/   # 이 도메인 전용 컴포넌트
│   │       ├── hooks/        # 이 도메인 전용 훅
│   │       ├── api/          # 서버 호출 함수 + 쿼리 키
│   │       ├── types.ts      # 이 도메인 타입
│   │       └── index.ts      # 외부 공개용 re-export (배럴은 여기서만)
│   │
│   ├── hooks/                # 도메인 무관 공통 훅 (useDebounce, useMediaQuery ...)
│   ├── lib/                  # 순수 유틸 + 외부 클라이언트
│   │   ├── api/              # fetch 래퍼(http), baseURL, ApiError, 토큰 주입   → §6.2
│   │   ├── query/            # TanStack Query 클라이언트 팩토리                 → §6.3
│   │   └── utils/            # cn, 날짜/숫자 포매터 등 순수 함수
│   ├── types/                # 전역 타입 (api-schema.d.ts 자동생성물, 공통 도메인 타입)
│   └── constants/            # 라우트 경로, 쿼리키 접두사, 환경 상수 등
│
├── public/
├── docs/                  # 프론트엔드 문서
│   ├── frontend-convention.md
│   └── testing-guide.md
└── 설정 파일: package.json, tsconfig.json, next.config.ts, eslint.config.mjs,
   postcss.config.mjs, .prettierrc.json, .prettierignore
```

> `(auth)` / `(main)` 라우트 그룹, `loading.tsx`/`error.tsx`/`not-found.tsx` 는 인증·화면 작업에서
> 추가한다. 이 문서에서는 자리와 이름만 확정한다.

### 어디에 둘지 판단 기준

| 질문                                              | 위치                                     |
| ------------------------------------------------- | ---------------------------------------- |
| URL(페이지)이 필요한가?                           | `app/{segment}/page.tsx` (조립만)        |
| 특정 도메인에서만 쓰는가?                         | `features/{도메인}/`                     |
| 2개 이상 도메인이 공유하는 UI인가?                | `src/components/` (`ui/` 또는 `layout/`) |
| React 의존 없는 순수 함수 / 외부 SDK 래퍼인가?    | `src/lib/`                               |
| 여러 도메인이 쓰는 React 훅인가?                  | `src/hooks/`                             |
| 앱 전역에서 참조하는 고정값인가?                  | `src/constants/`                         |
| 여러 도메인이 공유하는 타입 / 자동 생성 타입인가? | `src/types/`                             |

## 3. 경로 별칭 (tsconfig `paths`)

`@/` 는 `src/` 를 가리킨다. 상대경로 `../../..` 금지, 별칭 사용.

| 별칭             | 실제 경로                               |
| ---------------- | --------------------------------------- |
| `@/*`            | `src/*` (아래에 해당 없을 때 catch-all) |
| `@/app/*`        | `src/app/*`                             |
| `@/components/*` | `src/components/*`                      |
| `@/features/*`   | `src/features/*`                        |
| `@/hooks/*`      | `src/hooks/*`                           |
| `@/lib/*`        | `src/lib/*`                             |
| `@/types/*`      | `src/types/*`                           |
| `@/constants/*`  | `src/constants/*`                       |

```ts
import { Button } from "@/components/ui/Button";
import { useItemList } from "@/features/items/hooks/useItemList";
import { http } from "@/lib/api/http";
import { ROUTES } from "@/constants/routes";
```

## 4. 네이밍 규칙

| 대상           | 규칙                                                  | 예                                 |
| -------------- | ----------------------------------------------------- | ---------------------------------- |
| 컴포넌트 파일  | `PascalCase.tsx` (기본 export 이름과 동일)            | `ItemCard.tsx`, `Button.tsx`       |
| 훅 파일        | `camelCase.ts`, `use` 접두사                          | `useItemList.ts`, `useDebounce.ts` |
| 유틸/일반 모듈 | `camelCase.ts`                                        | `formatPrice.ts`, `http.ts`        |
| API 모듈       | `{도메인}.api.ts`, 쿼리 키 `{도메인}.keys.ts`         | `items.api.ts`, `items.keys.ts`    |
| 타입 전용 파일 | `types.ts` 또는 `{이름}.types.ts`                     | `features/items/types.ts`          |
| 상수 파일      | `camelCase.ts`, 값은 `SCREAMING_SNAKE_CASE`           | `routes.ts` 안에 `ROUTES`          |
| 폴더           | 소문자 `kebab-case` (App Router 세그먼트 규칙과 통일) | `features/items`, `app/my-items`   |
| 라우트 그룹    | `(그룹명)` 소문자                                     | `(auth)`, `(main)`                 |
| 테스트         | 대상 옆 `*.test.ts(x)`                                | `formatPrice.test.ts`              |

## 5. import / export 규칙

- **배럴(`index.ts`) 은 `features/{도메인}/` 경계에서만.** 그 외 폴더에서 남발 금지
  (순환 참조·번들 비대화 원인). 컴포넌트는 파일 경로로 직접 import.
- **도메인 간 직접 import 금지.** `features/a` → `features/b` 는 `features/b/index.ts`
  공개분만 사용. 얽히면 공통 로직을 `lib/` 또는 상위로 승격.
- import 순서·정렬은 ESLint/Prettier 에 위임한다(수동 정렬 금지).
- 타입만 가져올 때는 `import type` 사용.

## 6. API 통신 레이어

### 6.1 환경변수

| 키                         | 용도                                   | 비고                                    |
| -------------------------- | -------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 API 베이스 URL (끝 슬래시 없이) | 클라이언트 번들에 인라인됨. 비밀값 금지 |

> 2026-09-10 기준 프론트에서 쓰는 공개 환경변수는 위 1개뿐. 인증(④)은 쿠키 기반이라 추가 키 불필요.

- `frontend/.env.example` 를 복사해 `frontend/.env.local` 을 만든다: `cp .env.example .env.local`
- `.env*` 는 `.gitignore` 처리, `.env.example` 만 추적된다.
- 값이 없으면 `src/lib/api/config.ts` 가 모듈 로드 시점에 즉시 throw 한다 (fail-fast). → 빌드/타입체크 환경에도 값이 있어야 함.

#### 환경별 `NEXT_PUBLIC_API_BASE_URL`

| 환경                | 값                        | 주입 위치                                                               |
| ------------------- | ------------------------- | ----------------------------------------------------------------------- |
| 로컬(백엔드 직접)   | `http://localhost:8080`   | 각자 `frontend/.env.local`                                              |
| 로컬(공유 dev 서버) | `https://api.haru-dev.me` | 각자 `frontend/.env.local`                                              |
| CI (test/build)     | `https://api.haru-dev.me` | `.gitlab-ci.yml` `frontend-test` / `frontend-build` 잡 `variables`      |
| Vercel (프로덕션)   | 운영 API URL              | **Vercel 대시보드 → Project → Settings → Environment Variables** (수동) |

- 시크릿이 아니므로 CI 값은 `.gitlab-ci.yml` 에 평문으로 둔다. 바꾸려면 GitLab **Project → Settings → CI/CD → Variables** 에서 동명 변수로 override.
- Vercel 값은 파일로 관리되지 않는다. 대시보드에 Production/Preview 각각 등록돼 있는지 배포 담당이 확인.

#### 새 환경변수 추가 절차

1. `frontend/.env.example` 에 키 + 주석 추가
2. `.gitlab-ci.yml` 의 `frontend-test` / `frontend-build` `variables` 에 추가 (빌드에 필요한 경우)
3. Vercel 대시보드에 등록
4. 위 표 갱신
5. 비밀값이면 `NEXT_PUBLIC_` 을 **붙이지 않는다** (서버 전용). 클라이언트에서 필요하면 API 라우트로 우회.

### 6.2 fetch 래퍼 — `@/lib/api`

```ts
import { http, ApiError, isApiError } from "@/lib/api";

const item = await http.get<Item>("/items/1");
await http.post<CreateItemRes>("/items", {
    body: { name: "맥북", price: 1200000 },
});
await http.get<Item[]>("/items", { query: { status: "OWNED", page: 1 } });
```

- 메서드: `http.get / post / put / patch / del` (`delete` 는 예약어라 `del`).
- `body` 는 JSON 자동 직렬화. FormData 등은 `rawBody` 사용.
- `Authorization: Bearer <token>` 자동 주입. 토큰 출처는 ④에서 `setAccessTokenProvider()` 로 연결.
  로그인·토큰 재발급처럼 토큰이 필요 없는 요청은 `{ skipAuth: true }`.
- 타임아웃 기본 10s (`{ timeoutMs }` 로 조정, `0` 이면 해제).
- **모든 실패는 `ApiError` 로 정규화되어 throw** 된다. `err.kind`: `"http" | "network" | "timeout" | "parse"`.
  `err.status`, `err.code`(백엔드 코드), `err.isUnauthorized`, `err.isClientError`, `err.isServerError` 제공.

### 6.3 서버 상태 — TanStack Query

- Provider: `src/app/providers.tsx` (`"use client"`) → `src/app/layout.tsx` 에서 `children` 을 감쌈.
- 클라이언트 팩토리: `src/lib/query/queryClient.ts` — 서버는 매 요청 새 인스턴스, 브라우저는 싱글턴.
- 기본 옵션: `staleTime` 60s, `gcTime` 5m, `refetchOnWindowFocus` off, `retry` 1회(단 `ApiError` 4xx 는 재시도 안 함), mutation `retry` off.
- 개발 모드에서 React Query Devtools 자동 노출.

### 6.4 도메인별 API / 쿼리 키 규약

각 도메인은 `features/{도메인}/api/` 아래에 둔다.

```
features/items/
├── api/
│   ├── items.api.ts   # http 를 호출하는 순수 함수 (fetchItemList, createItem ...)
│   └── items.keys.ts  # 쿼리 키 팩토리
└── hooks/
    └── useItemList.ts # useQuery/useMutation 로 위 둘을 조합
```

```ts
// items.keys.ts — 키는 항상 배열, 도메인명으로 시작
export const itemKeys = {
    all: ["items"] as const,
    list: (params: ItemListParams) => [...itemKeys.all, "list", params] as const,
    detail: (id: number) => [...itemKeys.all, "detail", id] as const,
};
```

- 컴포넌트에서 `http` 를 직접 부르지 않는다. 반드시 도메인 훅을 거친다.
- `queryKey` 는 위 팩토리만 사용 (문자열 하드코딩 금지) → 무효화(`invalidateQueries`) 일관성 확보.

### 6.5 백엔드 타입 자동 생성

- `npm run gen:api` → `openapi-typescript` 로 `https://api.haru-dev.me/api-docs` 를 받아
  `src/types/api-schema.d.ts` 생성 (Prettier 후처리 포함).
- 이 파일은 **자동 생성물**: 직접 수정 금지, ESLint 대상에서 제외됨.
- 사용: `import type { components } from "@/types/api-schema";` → `type Item = components["schemas"]["Item"]`.
  도메인별 `types.ts` 에서 이렇게 뽑아 alias 로 재노출한다.
- 스키마 JSON 경로가 다르면(`/v3/api-docs` 등) `package.json` 의 `gen:api` URL 을 수정한다.
- 백엔드 DTO 가 바뀌면 재실행하고 diff 를 커밋한다.

## 7. 관련 후속 작업 (PROGRESS.md 기준)

- ~~② API 통신 레이어~~ ✅ `src/lib/api/`, `src/lib/query/`, `src/app/providers.tsx`, `gen:api`
- ~~③ 환경변수 규약~~ ✅ `frontend/.env.example`, `.gitlab-ci.yml` CI 주입, §6.1 환경별 표/추가 절차 (Vercel 대시보드 등록·로컬 baseURL 합의는 팀 확인 대기)
- ④ 인증 흐름 뼈대 → `src/app/(auth)/`, `src/app/(main)/`, `middleware.ts`, `setAccessTokenProvider()` 연결
- ⑤ 디자인 토큰 → `src/app/globals.css` 의 `@theme`
