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
