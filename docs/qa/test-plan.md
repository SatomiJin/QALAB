# Test Plan — QA Learning Lab V1

| | |
|---|---|
| Version | 1.0 (Phase 7) |
| Product | QA Learning Lab: React frontend, NestJS API, Supabase (Postgres + Auth) |
| Related | [Test scenarios](test-scenarios.md) · [Test cases](test-cases.md) · [Regression checklist](regression-checklist.md) · [Testing strategy](../testing-strategy.md) |

## 1. Purpose

This plan treats the platform as a QA project. It defines what is tested, how, at which level, and when the release counts as ready. It lists the risks that drive the priorities and the findings that are still open.

## 2. Scope

**In scope**

| Area | Features |
|---|---|
| Authentication | register, verify email, resend, login, refresh, logout, forgot / reset / change password, rate limits |
| Profile | read and edit own profile, protected fields (role) |
| Learning | catalogue, course outline, lesson reading, progress tracking, completion, continue, Vietnamese content |
| Practice | five exercise types, server-side grading, attempt history, self-assessment, answer-key secrecy |
| Admin CMS | course / module / lesson / exercise CRUD, publish lifecycle, reorder, delete rules, preview |
| Dashboard | derived progress, streak, weak areas, activity, Progress page |
| Curriculum | seeded content validity, idempotent import |
| Cross-cutting | RLS on every table, role checks, error format, i18n (EN / VI), theme (light / dark), responsive layout |

**Out of scope for V1**

* Load and performance testing (no production traffic profile yet).
* Real email delivery (Supabase sends it; tests use generated links so no email is sent).
* Quality of machine translation (the provider is optional and off by default).
* Browsers other than Chromium desktop and Chromium mobile emulation (Pixel 7).
* A full accessibility audit (Phase 8).

## 3. Test levels and environments

| Level | What it proves | Runs against | Command |
|---|---|---|---|
| Unit (backend) | pure rules: grading, progress, streak, outline, schema parsers, curriculum validation | nothing external | `cd backend && npm test` |
| API (backend) | the real Nest app (guards, pipes, filters, rate limits) with Supabase faked in memory; real ES256 JWTs | in-process | `npm run test:e2e` |
| Integration (backend) | RLS, grants, triggers, views and real Supabase Auth, as a user with a JWT + anon key; the full journey through the real API | linked Supabase cloud project | `npm run test:int` |
| Unit (frontend) | pure UI logic: redirects, list params, form ↔ payload, verdicts | nothing external | `cd frontend && npm test` |
| E2E (frontend) | user flows in a production build, desktop + mobile, API mocked by a stateful contract mock | Vite preview | `npm run test:e2e` |
| Manual | exploratory sessions, screenshot review (light / dark, EN / VI, desktop / mobile), deployment smoke | local or Vercel preview | [regression checklist](regression-checklist.md) |

Test data: integration tests create `qalab-it-*@example.com` users with the admin API and delete them (and any content they made) after each file. E2E tests use in-memory mocks only.

## 4. Approach

* **Risk first.** Security and data integrity (section 5) are tested at two levels: through the API *and* directly against the database with a user's JWT, because a learner can call PostgREST without our backend.
* **Sweeps over lists.** Where a rule applies to every route (401 without a token, 401 with a bad token, 400 for a malformed id, 404 for an unknown id), the API test reads the route list from the OpenAPI document, so a new route is checked without editing the test (`test/api/security.e2e-spec.ts`).
* **One journey per level.** The ten important flows run as one journey through the UI (mocked API) and through the real API + database, so "progress persisted" is proven in Postgres, not only in a mock.
* **Contract mocks follow the backend rules.** The frontend mock grades, keeps forward-only progress and shows only published content, like the backend; it changes together with `docs/api.md`.
* **Regression tests for bugs.** Every fixed defect gets a test at the lowest level that reproduces it.
* **Language-independent selectors** (`data-testid`, `data-state`, roles) so the same tests run in English and Vietnamese.

## 5. Risks and priorities

| ID | Risk | Impact | Likelihood | Priority | Mitigation (tests) |
|---|---|---|---|---|---|
| R1 | A learner writes their own score (client-side or direct DB) | High | Medium | P1 | DTO rejects `score`/`isCorrect`/`userId`; no insert grant on attempts; immutable-attempt trigger (TC-SEC-06) |
| R2 | Answer keys or explanations leak before an attempt | High | Medium | P1 | no learner policy on `exercise_answers`; review only with own attempt (TC-SEC-05) |
| R3 | One learner reads or changes another learner's progress | High | Low | P1 | RLS owner policies, API derives the user from the JWT (TC-SEC-01, 02) |
| R4 | A learner reaches admin features or changes their role | High | Low | P1 | `RolesGuard` + `is_admin()` in RLS, column grants on `profiles` (TC-SEC-03, 04) |
| R5 | Account takeover: brute force, token reuse, enumeration | High | Medium | P1 | rate limits, refresh rotation, revocation, generic errors (TC-SEC-09 … 12) |
| R6 | Progress is lost or goes backwards | Medium | Medium | P1 | forward-only trigger, journey across logout / login (TC-E2E-06 … 09) |
| R7 | Draft content is visible to learners | Medium | Medium | P2 | visibility = item and every parent published, in RLS and queries (TC-E2E-10) |
| R8 | Translation failure breaks a page | Medium | Low | P2 | fallback to English with `translation: "unavailable"` |
| R9 | Curriculum import overwrites CMS edits or moves content | Medium | Low | P2 | import plan tests (`plan.spec.ts`) |
| R10 | Layout breaks in Vietnamese, dark mode or on mobile | Low | Medium | P3 | E2E on two viewports, screenshot review |

## 6. Entry and exit criteria

**Entry** (start testing a change): it compiles (`typecheck`), lints, migrations are pushed for integration tests, `docs/api.md` matches the DTOs.

**Exit** (release ready):

* All automated suites pass: backend unit, API, integration; frontend unit, E2E (desktop + mobile).
* No open defect of severity Critical or High; Medium ones are accepted in writing (section 8).
* Every P1 risk has passing tests at API and database level.
* The [regression checklist](regression-checklist.md) is completed for the release.
* Screenshot review done for changed screens (light / dark, EN / VI, desktop / mobile).

## 7. Defect classification

| Severity | Meaning | Example |
|---|---|---|
| Critical | security or data loss, no workaround | answer key returned to a learner |
| High | a main flow is blocked | cannot submit an exercise |
| Medium | a flow works with a workaround, or a security weakness with limited reach | wrong streak in one time zone |
| Low | cosmetic or wording | a Vietnamese label wraps badly |

Priority (P1 fix now → P3 when convenient) is set separately from severity, by impact on the next release.

## 8. Findings from Phase 7

Found while writing the security tests. None is a regression.

| ID | Finding | Severity | Status |
|---|---|---|---|
| F1 | **Access tokens stay valid after logout until they expire** (up to 1 hour, `jwt_expiry = 3600`). Logout revokes the session's refresh token, but the backend checks the JWT signature locally (JWKS) and PostgREST does the same, so a copied access token keeps working until expiry. | Medium | Accepted (2026-10-02): 1-hour expiry, the token lives only in memory; no session check per request |
| F2 | Rate-limit counters are in memory per instance. On Vercel each serverless instance counts on its own, so the real limit is higher than `AUTH_RATE_LIMIT` under load. Supabase Auth's own limits still apply behind it. | Medium | Accepted (2026-10-02); Supabase Auth limits remain behind it; a shared store (e.g. Redis) would fix it if needed |
| F3 | The login limit is per IP, not per account: many IPs can try one account. | Low | Accepted (2026-10-02) by design: one user signs in from several devices and networks (phone and computer); Supabase Auth limits apply too |
| F4 | Enumeration was prevented by identical answers, not identical timing. Measured on the real project (2026-10-02): login, unknown vs known email with a wrong password, medians 267 / 235 ms (noise, no leak); forgot-password and register without an email sent, about 150 ms, so the paths that send an email (known account) were the slow ones. | Low | Fixed (2026-10-02): register, resend-verification and forgot-password answer no sooner than `AUTH_MIN_RESPONSE_MS` (1500 ms); a log warning says when a request took longer than the floor. Test: `auth-timing.e2e-spec.ts` |

## 9. Deliverables

| Deliverable | Where |
|---|---|
| Test plan | this file |
| Test scenarios | [test-scenarios.md](test-scenarios.md) |
| Test cases (E2E flows, security) with traceability | [test-cases.md](test-cases.md) |
| Regression checklist | [regression-checklist.md](regression-checklist.md) |
| API tests | `backend/test/api/*.e2e-spec.ts` (incl. `security.e2e-spec.ts`) |
| Security / RLS tests | `backend/test/integration/*-rls.int-spec.ts`, `auth-flow.int-spec.ts` |
| Journey through the real stack | `backend/test/integration/journey.int-spec.ts` |
| Playwright E2E tests | `frontend/tests/e2e/*.spec.ts` (incl. `journey.spec.ts`) |
| Coverage per phase | [testing-strategy.md](../testing-strategy.md) |
