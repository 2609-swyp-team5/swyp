# 프론트엔드 테스트 가이드

이 문서는 `frontend/` 테스트를 같은 방식으로 작성하고 실행하기 위한 팀 규칙입니다.

## 1. 테스트 도구

| 대상          | 도구                           |
| ------------- | ------------------------------ |
| 단위·컴포넌트 | Vitest + React Testing Library |
| 브라우저 E2E  | Playwright                     |
| API mocking   | MSW                            |

- 단위·컴포넌트 테스트는 빠르게 실행할 수 있어 개발 중 자주 실행합니다.
- E2E는 실제 브라우저에서 사용자의 핵심 흐름을 검증합니다.
- 결제·알림 등 외부 서비스는 실제 서비스가 아니라 테스트 환경이나 mocking을 사용합니다.

## 2. 파일 위치

단위·컴포넌트 테스트는 대상 코드 옆에 둡니다.

```text
components/
└── PriceInput/
    ├── PriceInput.tsx
    └── PriceInput.test.tsx

features/item/
└── api/
    ├── item-api.ts
    └── item-api.test.ts
```

공용 테스트 설정은 `tests/`에 두고, E2E는 `e2e/`에 둡니다.

```text
tests/
├── setup.ts
└── mocks/
    └── server.ts

e2e/
└── item-registration.spec.ts
```

파일명 규칙:

- 단위·컴포넌트: `*.test.ts`, `*.test.tsx`
- E2E: `*.spec.ts`

## 3. 실행 명령

```bash
# 로컬 watch 모드
npm run test

# 전체 테스트 1회 실행
npm run test:run

# 특정 파일만 실행
npm run test:run -- app/page.test.tsx

# 테스트 이름으로 실행
npm run test:run -- -t "shows the getting-started message"

# 특정 줄의 테스트 실행
npm run test:run -- app/page.test.tsx:7

# 커버리지 확인
npm run test:coverage

# E2E 실행
npm run test:e2e

# Playwright UI 모드
npm run test:e2e:ui
```

CI에서는 watch 모드가 아닌 `npm run test:run`을 사용해 전체 단위·컴포넌트 테스트를 1회 실행합니다. coverage가 필요할 때는 별도로 `npm run test:coverage`를 실행합니다.

## 4. 단위·컴포넌트 테스트 규칙

### 기본 원칙

- 구현 방식이 아니라 사용자가 확인할 수 있는 동작을 검증합니다.
- 테스트 하나는 한 가지 행동과 결과를 확인합니다.
- 테스트 이름은 내부 함수명이 아니라 기대하는 동작으로 작성합니다.
- 테스트 간 상태와 데이터를 공유하지 않습니다.
- 스냅샷 테스트는 기본적으로 사용하지 않습니다.

### 요소 찾기 우선순위

다음 순서로 사용자에게 가까운 쿼리를 사용합니다.

1. `getByRole`
2. `getByLabelText`
3. `getByText`
4. `getByPlaceholderText`
5. `getByTestId`

`data-testid`는 role이나 label로 찾기 어려운 경우에만 사용합니다. CSS class나 DOM 구조에 의존하는 선택자는 사용하지 않습니다.

### 상호작용과 비동기 처리

- 클릭·입력은 `userEvent`를 사용합니다.
- 비동기 결과는 임의의 sleep 대신 `findBy*` 또는 `waitFor`를 사용합니다.
- API 호출은 MSW handler로 성공·실패 응답을 직접 정의합니다.
- 실제 백엔드, 결제 서버, 소셜 로그인 서버에 의존하지 않습니다.

### 테스트 구조

Arrange(준비) → Act(행동) → Assert(검증) 순서로 작성합니다.

```tsx
it("shows an error when the email is invalid", async () => {
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText("이메일"), "invalid");
    await userEvent.click(screen.getByRole("button", { name: "가입하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 형식이 올바르지 않습니다");
});
```

## 5. E2E 테스트 규칙

- 모든 화면이 아니라 핵심 사용자 플로우를 우선 테스트합니다.
- 각 테스트는 다른 테스트의 실행 순서에 의존하지 않아야 합니다.
- `getByRole`, `getByLabel`, `getByText` 등 사용자에게 보이는 요소를 우선 사용합니다.
- CSS selector와 긴 XPath는 사용하지 않습니다.
- 고정된 임의의 시간 대기보다 Playwright의 web-first assertion을 사용합니다.
- 외부 서비스는 테스트 계정, sandbox, 또는 네트워크 mocking으로 통제합니다.
- 실패 시 원인 확인을 위해 trace와 screenshot을 남깁니다.

우선 작성할 플로우:

- 회원가입·로그인
- 인증된 화면 진입
- 물건 등록
- 가격 알림 설정
- 결제
- 알림 확인

## 6. 새 기능의 테스트 기준

동작이 바뀌는 기능을 개발하면 다음 기준을 적용합니다.

- 순수 함수·API 변환 로직: 단위 테스트 추가
- 사용자 입력·상태 변화가 있는 컴포넌트: 컴포넌트 테스트 추가
- 여러 화면과 서버가 연결된 핵심 플로우: E2E 테스트 추가
- 테스트를 추가하지 않았다면 MR에 이유를 작성

모든 코드 줄에 테스트를 억지로 추가하지는 않습니다. 초기에는 커버리지를 Merge 차단 기준으로 사용하지 않고, 리포트로 추이를 확인합니다.

## 7. MR 체크리스트

- [ ] 동작 변경에 대한 단위·컴포넌트 테스트를 추가하거나 수정했는가?
- [ ] 핵심 플로우 변경 시 E2E 테스트를 추가하거나 수정했는가?
- [ ] `npm run test:run`이 통과하는가?
- [ ] 필요한 경우 `npm run test:e2e`가 통과하는가?
- [ ] 테스트를 작성하지 않았다면 그 이유를 설명했는가?
