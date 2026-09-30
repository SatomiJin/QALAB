# Testing strategy

| Layer | Where | Runs against | Command |
|---|---|---|---|
| Backend unit | `backend/src/**/*.spec.ts` | nothing external | `npm test` |
| Backend API | `backend/test/api/*.e2e-spec.ts` | the real Nest app (guards, pipes, filters), Supabase Auth faked in memory | `npm run test:e2e` |
| Backend integration | `backend/test/integration/*.int-spec.ts` | the linked Supabase cloud project (`backend/.env`) | `npm run test:int` |
| Frontend unit | `frontend/src/**/*.test.ts` | nothing external | `npm test` |
| Frontend E2E | `frontend/tests/e2e/*.spec.ts` | production build, desktop + mobile, API mocked with `page.route` | `npm run test:e2e` |

## Why a fake Supabase in API tests

API tests must be fast, deterministic and not send email. `test/support/fake-auth-server.ts` mimics the GoTrue calls the backend makes and **signs real ES256 JWTs**; the backend verifies them with the same code as production (only the JWKS is swapped). So expired, tampered, unsigned and wrong-issuer tokens are tested for real. It also models refresh token rotation, session revocation, single-use token hashes, and GoTrue's "password before confirmation" order.

## Integration tests (real Supabase)

* RLS is tested directly with supabase-js as a signed-in user (what an attacker with a JWT and the public anon key could do), not only through the API. This replaces pgTAP: there is no local Postgres (no Docker).
* Users are created with the admin API and token hashes come from `auth.admin.generateLink`, so **no email is sent** and the Supabase email rate limit is untouched. Users are named `qalab-it-*@example.com` and deleted after each file.
* Requires the migrations to be pushed first.

## Frontend E2E

`tests/e2e/support/mock-api.ts` is a stateful mock of the backend contract (docs/api.md). Tests use roles and `data-testid` / `data-state` where text would tie them to one language.

## Phase 1 coverage

| Requirement (plant.md) | Test |
|---|---|
| Each auth endpoint: happy path, validation, wrong password, unverified, invalid/expired token hash | `test/api/auth.e2e-spec.ts` |
| Generic login error; forgot password always 200 | `auth.e2e-spec.ts` › login / forgot-password |
| Rate limit → 429 | `test/api/rate-limit.e2e-spec.ts` |
| Expired / tampered token → 401; refresh works; logout revokes refresh token | `auth.e2e-spec.ts` › access tokens / refresh / logout; `auth-flow.int-spec.ts` |
| RLS: profile access | `test/integration/profiles-rls.int-spec.ts` |
| `/me`, protected fields, `RolesGuard` | `test/api/profile.e2e-spec.ts` |
| E2E: register → verify → login → logout | `frontend/tests/e2e/auth.spec.ts` |

## Phase 2 coverage

| Requirement (plant.md) | Test |
| --- | --- |
| Continue / progress / catalogue logic (outline, next lesson, forward-only progress, continue choice) | `backend/src/learning/outline.spec.ts` |
| Learner endpoints: happy path, 401, invalid UUID 400, validation 400 (incl. `userId`, `status`), 404 for draft / draft-parent / unknown content, per-user progress | `backend/test/api/learning.e2e-spec.ts` (fakes: `test/support/fake-learning.ts`) |
| RLS: published-only content (parents too), admin reads drafts, anon denied, no content writes, own progress only, forward-only trigger, no delete, FK restrict | `backend/test/integration/learning-rls.int-spec.ts` |
| Reading-progress maths (percent, 10-point reporting steps, verdict mapping) | `frontend/src/features/learning/progress.test.ts` |
| E2E: skills in order, start → read → scroll tracked → complete → next lesson; course progress; resume; raw HTML not rendered; empty, error + retry, 404; Vietnamese | `frontend/tests/e2e/learning.spec.ts` (mock: `tests/e2e/support/mock-learning.ts`) |

## Pagination and translation coverage

| Requirement | Test |
| --- | --- |
| Markdown ↔ HTML pipeline: identity round trip, structure/code/URLs/tables kept, glossary terms, entity decoding | `backend/src/translation/markdown-translate.spec.ts` |
| Google provider: key in header (not URL), errors do not leak the key, batching | `backend/src/translation/translator.spec.ts` (`fetch` stubbed) |
| `/courses` pages (default 20, 50/100, across skills, past the end, invalid values → 400); `?lang=vi` on lesson, course, list, continue; cache reuse and invalidation on edit; fallback with no key, provider failure, unreadable cache | `backend/test/api/learning-i18n-pages.e2e-spec.ts` (fakes: `test/support/fake-translation.ts`) |
| RLS on `content_translations`: learners read published only, nobody writes, delete trigger | `backend/test/integration/translations-rls.int-spec.ts` |
| URL list params (parse, defaults, round trip) | `frontend/src/features/learning/list-params.test.ts` |
| E2E: breadcrumb + back buttons, back returns to the same list page, pagination (desktop + mobile size picker), skill filter, invalid URL params, machine translation note + English original toggle, unavailable note | `frontend/tests/e2e/learning.spec.ts` |
