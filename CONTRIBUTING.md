# 협업 규칙

스위프 15기 5팀의 Git 협업과 Pull/Merge Request 규칙입니다.

## 브랜치 전략

| 브랜치                      | 용도                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `main`                      | 완성된 안정 버전만 관리합니다. 2명 이상 승인 후 반영합니다. |
| `develop`                   | 개발 기능을 통합합니다. 2명 이상 승인 후 반영합니다.        |
| `feature/{작업자}/{기능명}` | 신규 기능을 개발합니다.                                     |
| `fix/{작업자}/{기능명}`     | 개발 중 발견한 버그를 수정합니다.                           |
| `hotfix/{작업자}/{기능명}`  | `main`의 긴급 버그를 수정합니다.                            |

브랜치 이름은 작업자 이니셜과 기능명을 모두 포함해야 합니다.

```text
올바른 예: feature/uh/comment
잘못된 예: feature/comment, comment
```

## 작업 시작 전 최신화

새 작업을 시작하기 전에 `develop`을 최신 상태로 맞추고 작업 브랜치를 rebase합니다.

```bash
git fetch
git switch develop
git pull origin develop

git switch feature/{작업자}/{기능명}
git rebase develop
git push origin feature/{작업자}/{기능명} --force-with-lease
```

## Pull/Merge Request 규칙

### 작성자

- MR 템플릿을 작성하고 체크리스트를 확인한 후 생성합니다.
- 충돌이 발생하면 즉시 팀원에게 공유하고 지원을 요청합니다.
- 리뷰어 Comment를 확인한 후 코드를 수정하거나 논의합니다.
- Approve 2개 이상을 확보한 후 Git 관리자에게 Merge를 요청합니다.

### 리뷰어

- MR 생성 알림을 확인하고 코드를 검토합니다.
- 수정이 필요한 부분이나 궁금한 점은 Comment로 남깁니다.
- 문제가 없으면 검토 완료 후 Approve로 상태를 변경합니다.

### 금지 사항

- `main`, `develop` 브랜치에 직접 Push하지 않습니다.
- PR/MR 없이 바로 Merge하지 않습니다.
- 팀원의 브랜치를 허락 없이 수정하거나 Push하지 않습니다.
- `package.json`, `package-lock.json` 등 프로젝트 관리자 영역의 파일은 사전 협의 없이 수정하지 않습니다.

## 충돌 해결

- 충돌을 혼자 해결하지 않고 팀 채널에 공유합니다.
- 최소 2명 이상이 함께 커밋 히스토리를 확인하며 해결합니다.
- 충돌 해결 후에는 다음 메시지로 커밋합니다.

```bash
git commit -m "fix: 충돌 해결"
```

## 커밋 메시지

커밋 제목은 `커밋타입: 요약` 형식을 사용합니다.

- 제목은 50자 이내로 작성합니다.
- 제목 끝에 마침표를 작성하지 않습니다.
- 본문은 선택 사항이며, 한 줄당 72자 이내로 작성합니다.
- 본문은 How보다 What과 Why를 중심으로 작성합니다.

| 타입       | 용도                                      |
| ---------- | ----------------------------------------- |
| `feat`     | 새로운 기능 추가                          |
| `fix`      | 버그 수정                                 |
| `docs`     | 문서 수정                                 |
| `style`    | 포맷팅, 세미콜론 등 로직 변경이 없는 수정 |
| `refactor` | 코드 리팩토링                             |
| `test`     | 테스트 코드 추가·수정                     |
| `chore`    | 빌드 설정, 패키지 매니저 등 기타 작업     |

예시:

```text
feat: comment router 추가
fix: 로그인 만료 응답 처리
docs: 프론트엔드 테스트 가이드 추가
```

## 코드 컨벤션

프론트엔드 폴더 구조, 네이밍, import/export 규칙은 [`frontend/docs/frontend-convention.md`](frontend/docs/frontend-convention.md)를 참고합니다.

## 테스트

프론트엔드 테스트 작성법과 명령어는 [`frontend/docs/testing-guide.md`](frontend/docs/testing-guide.md)를 참고합니다.

동작이 변경되는 기능은 다음 기준으로 테스트를 추가합니다.

- 순수 함수·API 변환 로직: 단위 테스트
- 사용자 입력·상태 변화가 있는 컴포넌트: 컴포넌트 테스트
- 여러 화면과 서버가 연결된 핵심 사용자 흐름: E2E 테스트
- 테스트를 추가하지 않았다면 MR에 이유를 작성

프론트엔드 MR 전에는 최소한 다음 명령을 실행합니다.

```bash
cd frontend
npm run test:run
npm run test:e2e
```

## 커밋 전 자동 검사

프론트엔드 파일을 커밋하면 Husky가 `lint-staged`를 실행합니다. `git add`한 파일만 검사하므로 커밋마다 전체 프로젝트를 검사하지 않습니다.

- 코드 파일: ESLint 자동 수정 후 Prettier 적용
- 문서·설정 파일: Prettier 적용
- Push 전: TypeScript 전체 검사와 Push되는 코드에 연결된 단위·컴포넌트 테스트
- 전체 테스트·coverage·E2E·빌드: GitLab CI에서 실행

프론트엔드 파일이 포함된 커밋의 메시지는 `commit-msg` 훅에서 커밋 타입, 제목 길이, 마침표 사용 여부를 검사합니다.

자동 검사를 통과하지 못하면 커밋이 중단됩니다. 긴급하게 훅을 건너뛰어야 하는 경우에는 팀에 사유를 공유한 후 다음 명령을 사용할 수 있습니다.

```bash
HUSKY=0 git commit -m "커밋 메시지"
```
