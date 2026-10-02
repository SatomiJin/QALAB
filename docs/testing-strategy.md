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

## Phase 8 coverage (polish)

| Requirement | Test |
| --- | --- |
| No WCAG 2.1 A/AA (+ axe best-practice) violation on the auth, learner, admin, 404 and 403 screens, light and dark (contrast is per theme) | `frontend/tests/e2e/accessibility.spec.ts` (`@axe-core/playwright`) |
| Skip link reaches the content; a page change focuses `main` and starts at the top; a filter change keeps focus on the tab | `frontend/tests/e2e/polish.spec.ts` |
| 403 for learners renders inside the app frame | `polish.spec.ts` |
| Overflowing tab rows mark the hidden side and scroll the current tab into view | `polish.spec.ts` |
| A load error reads as Blocked (`role=alert`) and *Try again* recovers | `polish.spec.ts` |

axe covers the rendered page, not dialogs, menus or drawers once opened; those are covered by the keyboard and role-based assertions in the feature specs. A screenshot review (light + dark × EN + VI × desktop + mobile, empty / error / API-down states) was done by hand with a throwaway harness and is not part of the suite.

## QA documents (Phase 7)

The platform is tested as a QA project: [test plan](qa/test-plan.md) (scope, levels, risks, entry/exit criteria, open findings), [test scenarios](qa/test-scenarios.md), [test cases](qa/test-cases.md) (the ten E2E flows and twelve security scenarios, traced to tests) and the [regression checklist](qa/regression-checklist.md).

## Phase 7 coverage (QA)

| Requirement (plant.md) | Test |
| --- | --- |
| E2E flows 1–10 through the UI: register → verify → login → open lesson → complete → quiz → Progress → logout → login → progress kept; admin builds and publishes a course, a learner finds it | `frontend/tests/e2e/journey.spec.ts` (the admin mock's published content feeds the learning mock: `MockAdmin.learnerCourses`) |
| The same flows through the real API and Supabase: progress, attempt and dashboard read back from Postgres in a new session; draft course 404 until published; refresh token dead after logout | `backend/test/integration/journey.int-spec.ts` |
| Every protected route (read from the OpenAPI document) is 401 without a token, with an expired token and with a tampered token; only the 8 public routes are open | `backend/test/api/security.e2e-spec.ts` |
| Every path id: non-UUID → 400, unknown → 404 (GET / DELETE, and writes to lessons, exercises, attempts) | `security.e2e-spec.ts` |
| 429 on every public auth endpoint | `backend/test/api/rate-limit.e2e-spec.ts` |
| No account enumeration by timing: register / resend / forgot wait for `AUTH_MIN_RESPONSE_MS` for known and unknown emails; login is not slowed | `backend/test/api/auth-timing.e2e-spec.ts`; helper `backend/src/common/timing/min-duration.spec.ts` |
| Another learner cannot change or delete someone's attempt (DB) | `backend/test/integration/practice-rls.int-spec.ts` |
| Without a session every protected page redirects to login and no protected endpoint is called | `journey.spec.ts` |

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

## Phase 6 coverage (curriculum)

| Requirement (plant.md) | Test |
| --- | --- |
| The seeded curriculum loads without a problem: 7 skills, ≥ 20 modules, ≥ 40 lessons, ≥ 100 exercises, all five types, an exercise on every lesson; every prompt and answer key accepted by the grader's parsers; Vietnamese for every text (same headings and code blocks); every model answer (en and vi) passes its own concepts; sample course keeps its ids; a translation for every stored text | `backend/src/curriculum/curriculum.spec.ts` (also `npm run seed:curriculum -- --dry-run`) |
| Loader errors (unknown fields, missing `vi`, broken key, structure mismatch, failing model answer, stray files), derived ids, write plan (insert into empty, keep CMS edits by default, `--update`, never move / retype, attempted exercise ids locked), translations only for unchanged English, hash of the stored text | `backend/src/curriculum/plan.spec.ts` |
| UUID v5 against the RFC 9562 test vector | `curriculum.spec.ts` |

## Phase 5 coverage (dashboard and progress)

| Requirement (plant.md) | Test |
| --- | --- |
| Pure rules: percent, average, skill status, local date in a time zone, streak (today / yesterday / broken, longest, duplicates), weak skills (pass mark, order, retry never passed or hidden), weak concepts (grouping, order, limit) | `backend/src/dashboard/stats.spec.ts` |
| `GET /dashboard`: 401 / expired, 400 (`tz`, `lang`, unknown params), new learner all zero with 7 skills, derived overall / skills / best-score average / streak / continue / weak areas / activity, unpublished content ignored (streak still counts), streak alive until a day is missed, days in the asked time zone, own data only, translated titles | `backend/test/api/dashboard.e2e-spec.ts` (fake: `test/support/fake-dashboard.ts`, computes the views from the other fakes' stores) |
| `GET /progress`: lessons and exercises per course with stats, drafts hidden, skill filter, unknown skill, page past the end, 400 | `dashboard.e2e-spec.ts` |
| Views and `activity_days`: own rows only, admin sees all (so the backend filters), published-only counts, best / last score, `visible` flag on activity, anon denied, unknown time zone `22023` | `backend/test/integration/dashboard-rls.int-spec.ts` |
| Time zone fallback, activity verdict and link, local day parsing | `frontend/src/features/dashboard/dashboard.test.ts` |
| E2E: new learner, populated summary / streak / skills / retest / activity, skill link to Progress, continue button, error + retry, empty, Vietnamese; Progress matrix, exercise link, skill filter in the URL, error and empty | `frontend/tests/e2e/dashboard.spec.ts` (mock: `tests/e2e/support/mock-dashboard.ts`, derived from the learning and practice mocks) |

## Phase 4 coverage (Admin CMS)

| Requirement (plant.md) | Test |
| --- | --- |
| Learner gets 403 on every admin endpoint (23 routes), 401 without a token | `backend/test/api/admin.e2e-spec.ts` (access) |
| Draft content is invisible to learners: course / lesson / exercise 404 on learner endpoints while draft or after unpublish; admins read it | `admin.e2e-spec.ts` (publish rules); RLS: `backend/test/integration/admin-rls.int-spec.ts` (learners) |
| Delete is blocked when progress / attempts exist (lesson, module, course, exercise), also when the DB refuses after the check; unused content deletes with its children and keys | `admin.e2e-spec.ts` (delete rules); FK `23503` in `admin-rls.int-spec.ts` |
| Slug uniqueness gives 409 (courses global, lessons per module) | `admin.e2e-spec.ts`; `23505` in `admin-rls.int-spec.ts` |
| Publish rule, reorder (complete list, other parent, bad ids), course moved to another skill, empty PATCH, answer key vs prompt, type and parent immutable, prompt ids locked after attempts, answer key only for admins | `admin.e2e-spec.ts` (fake: `test/support/fake-admin.ts`, shares the learner fakes' stores) |
| Pure rules: in use, can publish, next order, complete reorder, locked ids | `backend/src/admin/content-rules.spec.ts` |
| RLS / grants: admin writes with audit columns from the JWT; forged audit columns / ids / parents / type give `42501`; learners write nothing; `reorder_content`, `content_usage` | `backend/test/integration/admin-rls.int-spec.ts` (learning / practice RLS suites updated: a learner update now matches no row instead of `42501`) |
| Slugify, list params, move, exercise form and payload per type, backend errors onto form fields | `frontend/src/features/admin/admin.test.ts` |
| E2E: list + filters, create course (auto slug, 409 on the field), outline (module, lesson, Markdown preview without raw HTML, publish), reorder by arrows (and rollback on failure), delete blocked / confirmed, exercise editor (multiple choice, scenario, bug report), locked answer rows, preview as learner, error / 404, learner no access | `frontend/tests/e2e/admin.spec.ts` (mock: `tests/e2e/support/mock-admin.ts`; runs with reduced motion so Select options are never clicked mid-animation) |

## Phase 3 coverage (practice)

| Requirement (plant.md) | Test |
| --- | --- |
| Grading per type (mandatory): exact match, % classification, required fields, severity/priority, concept coverage, reweighting, pass score, keyword matching (accents, word start, regex characters) | `backend/src/practice/grading.spec.ts` |
| Prompt, answer key, answer and self-assessment validation per type (ids exist, limits, unknown keys, empty forms) | `backend/src/practice/exercise-schema.spec.ts` |
| Practice endpoints: 401, invalid UUID / query 400, filters (several types), catalogue order, pagination, no answer key in any response, 404 for draft / hidden-lesson / unknown, grading per type, client `score` / `isCorrect` / `userId` rejected, attempt stored for the token's user, history per user newest first, stats, self-assessment once (409), other user's attempt 404, missing key → generic 500, translations incl. review texts only after an attempt | `backend/test/api/practice.e2e-spec.ts` (fakes: `test/support/fake-practice.ts`) |
| Attempt rate limit per user, not per IP | `backend/test/api/practice-rate-limit.e2e-spec.ts` |
| RLS: published-only exercises, no answer keys for learners (admins read), no attempt insert / delete / score update by learners, own attempts only, self-assessment once, immutable even for the service role, FK restrict, review-text translations gated by an attempt | `backend/test/integration/practice-rls.int-spec.ts` |
| Tab ↔ type mapping, verdicts, URL params, form values ↔ answer, backend field errors → form fields | `frontend/src/features/practice/practice.test.ts` |
| E2E: tab lists, filters + clear, all five forms (client validation, steps add/remove), result checks, explanation, model answer, self-assessment, try again keeps the answer, history + show an older result, list verdict / best score, lesson "Practise this lesson", empty / error + retry / 404, failed submit, Vietnamese | `frontend/tests/e2e/practice.spec.ts` (mock: `tests/e2e/support/mock-practice.ts`, grades with the backend rules) |
