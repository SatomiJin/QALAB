# Test Cases

Detailed cases for the important E2E flows and the security scenarios of plant.md › Phase 7. Each case names the automated tests that execute it; the **Status** column is the result of the Phase 7 run (2026-10-02). Scenarios: [test-scenarios.md](test-scenarios.md).

Paths: backend tests are under `backend/test/`, frontend tests under `frontend/tests/e2e/`. "UI" = Playwright on the production build with the contract mock (desktop + mobile). "Stack" = the real API against the real Supabase project.

## Test data

| Item | Value |
|---|---|
| Learner (UI) | registers as `journey.learner@example.com`, password `correct-horse-battery` |
| Admin / learner (UI, flow 10) | `admin@example.com` (role admin), `learner@example.com` |
| Users (stack) | `qalab-it-journey-*@example.com`, created with the admin API; deleted after the run |
| Course (stack) | `qalab-it-journey-<random>`: one published module, lesson and multiple choice exercise (correct option `a`); deleted after the run |
| Quiz (UI) | sample lesson *Why we test*, question "Which of these activities is testing…", correct option *Reviewing the requirements* |

## Important E2E flows

The flows run in order as one journey: UI `journey.spec.ts` › "register → login → lesson → quiz → progress → logout → login → progress kept" and "10. admin creates a course…"; stack `integration/journey.int-spec.ts`.

| ID | Flow | Preconditions | Steps | Expected result | Status |
|---|---|---|---|---|---|
| TC-E2E-01 | Register | Email not registered | 1. Open `/auth/register`. 2. Enter display name, email, password (8–72). 3. Submit. 4. Open the verification link. | "Check your email" shows the address; the link verifies the account, signs in and opens `/dashboard`. The link works once. | Pass (UI, stack) |
| TC-E2E-02 | Login | Verified account, signed out | 1. Open `/auth/login`. 2. Enter email and password. 3. Sign in. | `/dashboard` opens; `GET /me` returns the user with role `learner`. | Pass (UI, stack) |
| TC-E2E-03 | Open lesson | Signed in, published course | 1. Open Learning. 2. Open the course. 3. Open its first lesson. | Lesson page shows; status `in_progress`; the API received `POST /lessons/:id/progress {}`. | Pass (UI, stack) |
| TC-E2E-04 | Complete lesson | TC-E2E-03 | 1. Click *Mark as complete*. | Status `completed`, `progressPercent` 100, `completedAt` set. | Pass (UI, stack) |
| TC-E2E-05 | Submit quiz | TC-E2E-04 | 1. Open the lesson's exercise. 2. Choose the correct option. 3. Submit. | Result *Pass*, score 100, explanation shown. The request body is only `{ answer }`. Before submitting, the exercise response has no answer key or explanation. | Pass (UI, stack) |
| TC-E2E-06 | Verify progress | TC-E2E-05 | 1. Open Progress (and the dashboard). | The lesson and its exercise show *Pass*. Stack: course `completed`; dashboard skill *fundamentals* has 1 completed lesson, 1 attempted / 1 passed exercise, average 100; streak 1, active today; activity has `lesson_completed` and `exercise_attempted`. | Pass (UI, stack) |
| TC-E2E-07 | Logout | Signed in | 1. User menu → Sign out. | Login page opens; `POST /auth/logout` was called; the old refresh token answers 401. | Pass (UI, stack) |
| TC-E2E-08 | Login again | TC-E2E-07 | 1. Open `/progress`. 2. Sign in. | Redirected to `/auth/login?redirect=%2Fprogress`, then back to `/progress`. | Pass (UI, stack) |
| TC-E2E-09 | Progress persisted | TC-E2E-08 | 1. Read Progress, the lesson and the attempt history. | Same results as TC-E2E-06; lesson `completed` at 100 %; one attempt with score 100. Stack: read from Postgres in a new session. | Pass (UI, stack) |
| TC-E2E-10 | Admin publishes → learner sees | Admin and learner accounts | 1. Admin: new course (skill, title). 2. Add a published module. 3. Add a lesson, write content, set Published, save. 4. Publish the course. 5. Sign out; learner signs in. 6. Open Learning. | Before publishing, the course and lesson are 404 for the learner (stack). After publishing, the course is in the catalogue and its page lists the lesson, `not_started`. | Pass (UI, stack) |

## Security scenarios

| ID | Scenario | Steps | Expected result | Automated in | Status |
|---|---|---|---|---|---|
| TC-SEC-01 | User A cannot read User B's progress | A and B both have progress and attempts. A reads lessons, attempts, dashboard and progress through the API, and `lesson_progress`, `exercise_attempts` and the dashboard views directly with A's JWT. | API shows only A's data (B's lesson is `not_started` for A). DB returns only A's rows; B's rows are not returned. | API `learning.e2e-spec.ts` "keeps progress per user", `practice.e2e-spec.ts` "lists only your attempts…", `dashboard.e2e-spec.ts` "shows only the caller's own data"; DB `learning-rls` "hides and protects other users progress", `practice-rls` "learners read only their own attempts", `dashboard-rls` "hides other learners' rows / results / events" | Pass |
| TC-SEC-02 | User A cannot update User B's progress | A sends progress with `userId` of B; A inserts / updates / deletes B's rows with the JWT; A saves a self-assessment on B's attempt. | API 400 (unknown field) and 404 (other user's attempt). DB: insert 42501, update matches no row, attempt update / delete 42501; B's row unchanged. | API `learning.e2e-spec.ts` "rejects %j with 400", `practice.e2e-spec.ts` "is 404 for another user's attempt"; DB `learning-rls` "rejects progress written for another user", `practice-rls` "another learner cannot change or delete someone's attempt" | Pass |
| TC-SEC-03 | Learner cannot call admin endpoints | Learner token on each of the 23 admin routes; learner writes content directly. | 403 on every route (before validation); DB writes 42501 / no row. UI: no admin link, no-access page. | `admin.e2e-spec.ts` "%s %s is 403 for a learner"; `admin-rls` "cannot insert, update or delete any content"; UI `admin.spec.ts`, `auth.spec.ts` › Roles | Pass |
| TC-SEC-04 | Learner cannot change own role | `PATCH /me { role: "admin" }`; direct `update profiles set role`. | API 400, role still `learner`; DB 42501. A role claim inside the JWT is ignored. | `profile.e2e-spec.ts` "rejects the protected field %s", "does not trust a role claim inside the token"; `profiles-rls` "does not let a user change their own role"; `auth-flow.int-spec` | Pass |
| TC-SEC-05 | Learner cannot read answer keys | Read exercises and lessons through the API; select `exercise_answers` with the JWT; read review translations before an attempt. | No key, explanation, model answer or rubric in any response before the user's own attempt; DB returns no rows. | `practice.e2e-spec.ts` "returns the prompt without any answer key data"; `admin.e2e-spec.ts` "never returns the answer key to learners"; `practice-rls` "learners cannot read any answer key", "review texts are readable only after an attempt"; `journey.int-spec` step 5 | Pass |
| TC-SEC-06 | Client-supplied score / user id ignored | Submit an attempt with `score`, `isCorrect`, `userId` (also nested in `answer`); insert an attempt directly; update a graded attempt as the service role. | API 400 for each field; the stored attempt has the token's user id. DB insert 42501; graded columns unchanged even for the service role. | `practice.e2e-spec.ts` "rejects a client-sent score, verdict or user id", "stores the attempt for the user in the token"; `practice-rls` "learners cannot insert attempts", "even the service role cannot change a graded attempt" | Pass |
| TC-SEC-07 | Unauthenticated access | Call every route from the OpenAPI document without a token; open every protected page without a session; query tables with the anon key only. | Every route except the 8 public ones is 401 `{ statusCode, error, message }`. Pages redirect to login and call no protected endpoint. Anon key reads nothing. | `security.e2e-spec.ts` "every route except the public ones is 401 without a token"; UI `journey.spec.ts` "without a session every protected page sends you to login"; `*-rls` "anon" cases | Pass |
| TC-SEC-08 | Invalid vs unknown ids | Every route with an id: a non-UUID id; GET / DELETE with an unknown UUID; writes to an unknown lesson / exercise / attempt. | Non-UUID → 400 "uuid is expected"; unknown → 404 (never 403, which would confirm existence). | `security.e2e-spec.ts` "every id in a path is 400…", "every GET or DELETE of an unknown id is 404", "writes to an unknown … are 404" | Pass |
| TC-SEC-09 | Expired / tampered JWT | Call every protected route with an expired token and with a token whose payload was changed; also unsigned (`alg: none`) and foreign-issuer tokens. | 401 everywhere. | `security.e2e-spec.ts` "every protected route is 401 with an expired or tampered token"; `auth.e2e-spec.ts` › access tokens; `auth-flow.int-spec` "rejects a tampered access token" | Pass |
| TC-SEC-10 | Refresh token reuse | Refresh once, then reuse the old token; logout, then refresh with that session's token. | 401 in both cases; other sessions of the user stay signed in. | `auth.e2e-spec.ts` "rotates the refresh token", "revokes the session so its refresh token stops working"; `auth-flow.int-spec`; `journey.int-spec` step 7 | Pass. See finding F1: the *access* token keeps working until it expires |
| TC-SEC-11 | Brute-force login rate limited | Send 6 requests per minute to each public auth endpoint from one IP. | Requests 1–5 are not 429; the 6th is 429 with `Retry-After`; each endpoint counts separately; non-auth routes are not limited. | `rate-limit.e2e-spec.ts` (login, register, verify-email, resend-verification, refresh, forgot-password, reset-password) | Pass. See findings F2, F3 |
| TC-SEC-12 | No email enumeration | Register, resend and forgot with a known and an unknown email; login with a wrong password for a known, an unknown and an unverified email. | Same status, body and (for register / resend / forgot) minimum response time for known and unknown; login one generic 401; 403 *Email not verified* only after the right password. | `auth.e2e-spec.ts` "answers the same way for an existing email", "returns the same 200 for unknown and verified emails", "returns the same generic 401…", "does not reveal an unverified account behind a wrong password"; `auth-flow.int-spec` | Pass. Timing: `auth-timing.e2e-spec.ts` (every case waits for the response floor; login is not slowed), see F4 |

## Manual cases

Run before a release (see the [regression checklist](regression-checklist.md)). They cover what the automated suites cannot.

| ID | Case | Steps | Expected result |
|---|---|---|---|
| TC-MAN-01 | Real email registration | On the deployed app, register with a real mailbox; open the link from the email. | Email arrives; the link opens the frontend `/auth/verify` and signs in. |
| TC-MAN-02 | Real password reset email | Forgot password with a real mailbox; follow the link; set a new password. | Email arrives; reset works; old sessions are signed out. |
| TC-MAN-03 | Deployed frontend ↔ API | Open the Vercel URL; check the API status badge; sign in; open a lesson. | API online; no CORS error in the console; content loads. |
| TC-MAN-04 | Visual review | Changed screens in light / dark, EN / VI, desktop / mobile. | Matches [design.md](../design.md); no overflow, no hardcoded colours, Vietnamese fits. |
| TC-MAN-05 | Exploratory: grading | 20 minutes on free-text exercises with near-miss answers (accents, word order, synonyms). | Scores match the keyword rules; the model answer and self-assessment are always shown. |
