# Repository Guidelines

## Project Structure & Module Organization

- `frontend/`: Next.js App Router with TypeScript. Routes live in `app/`, domain code in `features/<domain>/`, shared components/utilities in `common/`, and static assets in `public/`.
- Frontend tests sit beside source files; `tests/` contains shared setup/mocks and `e2e/` contains browser tests.
- `backend/`: Java 21/Spring Boot. Domain packages live under `src/main/java/com/swyp/team5/`; tests mirror them in `src/test/java/`. Configuration and Flyway migrations live in `src/main/resources/`.
- Root `docker-compose.yml` manages supporting services; `.gitlab-ci.yml` defines CI.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm ci`: install locked dependencies.
- `npm run dev`: start development; `npm run build` and `npm run start`: build and serve production.
- `npx tsc --noEmit`, `npm run lint`, `npm run format:check`: validate types, ESLint rules, and formatting.
- `npm run test`: watch tests; `npm run test:run`: run once; `npm run test:coverage`: generate coverage.
- `npx playwright install chromium`, then `npm run test:e2e`: install the browser and run E2E tests.

From `backend/`, use `./gradlew` (`.\gradlew.bat` in PowerShell):

- `./gradlew bootRun`: start the API with the default local profile.
- `./gradlew spotlessCheck test`: check formatting and run standard tests.
- `./gradlew build`: validate and package the application.

## Coding Style & Naming Conventions

Use UTF-8, LF endings, four-space Java/TypeScript indentation, and two-space YAML indentation. Prettier enforces double quotes, semicolons, trailing commas, and Tailwind class ordering; apply it with `npm run format`. Java uses Spotless/Palantir (`./gradlew spotlessApply`). Use PascalCase components/classes, camelCase functions, `use`-prefixed hooks, and existing domain filenames such as `authApi.ts`.

## Testing Guidelines

Use Vitest, React Testing Library, and MSW for colocated `*.test.ts(x)` files; Playwright uses `e2e/*.spec.ts`. Test observable behavior and mock external services. Follow `frontend/docs/testing-guide.md`; coverage is informational, without an enforced threshold.

Backend tests use JUnit Jupiter/Mockito and `*Test.java` or `*Tests.java`. AI-tagged tests run separately through `./gradlew integrationTest` and may incur API costs. Database tests require `TEST_DB_*` and `TEST_JWT_*` variables; Flyway resets the configured test schema, so use a dedicated test database.

## Commit & Pull Request Guidelines

History includes `feat:`, `fix:`, `chore:`, `docs:`, and `test:` prefixes; prefer these prefixes with a concise summary. Keep changes focused. GitLab merge requests should describe behavior changes, link relevant issues, include UI screenshots when applicable, report validation, and explain omitted tests. Pass applicable CI checks before merging.

## Configuration

Keep secrets in ignored environment files. Set frontend `NEXT_PUBLIC_API_URL`; backend Gradle tasks load `backend/.env`. Consult profile YAML files for required variables.
