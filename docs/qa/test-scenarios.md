# Test Scenarios

High-level "what to test", grouped by feature. Each scenario is detailed in [test-cases.md](test-cases.md) when it is a main flow or a security rule; the rest are covered by the automated suites named in the last column. Priority follows the risks in the [test plan](test-plan.md#5-risks-and-priorities).

Levels: **U** unit · **A** API (faked Supabase) · **I** integration (real Supabase) · **E** Playwright E2E · **M** manual.

## Authentication

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-AUTH-01 | A visitor registers, verifies the email link and is signed in | P1 | A I E | `auth.e2e-spec.ts`, `auth-flow.int-spec.ts`, `auth.spec.ts`, `journey.*` |
| TS-AUTH-02 | Login with valid credentials; generic 401 for a wrong password or unknown email; 403 only for an unverified account with the right password | P1 | A I E | `auth.e2e-spec.ts` › login, `auth-flow.int-spec.ts` |
| TS-AUTH-03 | The session survives a reload (refresh token) and the refresh token rotates | P1 | A I E | `auth.e2e-spec.ts` › refresh, `auth.spec.ts` |
| TS-AUTH-04 | Logout revokes the session; its refresh token no longer works | P1 | A I E | `auth.e2e-spec.ts` › logout, `journey.int-spec.ts` |
| TS-AUTH-05 | Forgot → reset password → login with the new password; old sessions are signed out | P1 | A I E | `auth.e2e-spec.ts`, `auth.spec.ts` |
| TS-AUTH-06 | Change password checks the current password (400, not 401) | P2 | A E | `auth.e2e-spec.ts`, `auth.spec.ts` › Profile |
| TS-AUTH-07 | Register / resend / forgot give the same answer for known and unknown emails | P1 | A | `auth.e2e-spec.ts` |
| TS-AUTH-08 | Each public auth endpoint answers 429 after the per-minute limit | P1 | A | `rate-limit.e2e-spec.ts` |
| TS-AUTH-09 | Expired, tampered, unsigned or foreign tokens are 401 on every protected route | P1 | A I | `security.e2e-spec.ts`, `auth.e2e-spec.ts` › access tokens |
| TS-AUTH-10 | Open redirects after login are ignored | P2 | U E | `redirect.test.ts`, `auth.spec.ts` |

## Profile and roles

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-PROF-01 | A user edits their display name, level and goals | P2 | A I E | `profile.e2e-spec.ts`, `auth.spec.ts` › Profile |
| TS-PROF-02 | A learner cannot change role, id or email (API 400, DB 42501) | P1 | A I | `profile.e2e-spec.ts`, `profiles-rls.int-spec.ts` |
| TS-PROF-03 | A learner cannot see or open the admin area; admins can | P1 | A I E | `admin.e2e-spec.ts`, `admin.spec.ts`, `auth.spec.ts` › Roles |

## Learning

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-LEARN-01 | The catalogue lists published courses in skill order, filtered and paginated | P2 | A E | `learning-i18n-pages.e2e-spec.ts`, `learning.spec.ts` |
| TS-LEARN-02 | Opening a lesson records the visit; scrolling reports 10-point steps; *Mark as complete* completes it | P1 | U A E | `outline.spec.ts`, `learning.e2e-spec.ts`, `learning.spec.ts` |
| TS-LEARN-03 | Progress never goes backwards (service and DB trigger) | P1 | U A I | `outline.spec.ts`, `learning-rls.int-spec.ts` |
| TS-LEARN-04 | Continue suggests the right lesson (resume / next / start / none) | P2 | U A E | `outline.spec.ts`, `learning.spec.ts` |
| TS-LEARN-05 | Draft content, or content under a draft parent, is 404 for learners | P1 | A I | `learning.e2e-spec.ts`, `learning-rls.int-spec.ts` |
| TS-LEARN-06 | Lesson Markdown never renders raw HTML or scripts | P1 | E | `learning.spec.ts`, `admin.spec.ts` |
| TS-LEARN-07 | Vietnamese: manual → cached machine → English fallback, labelled | P2 | U A E | `learning-i18n-pages.e2e-spec.ts`, `learning.spec.ts` |

## Practice

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-PRAC-01 | Each of the five types is graded on the server with the documented weights | P1 | U A E | `grading.spec.ts`, `practice.e2e-spec.ts`, `practice.spec.ts` |
| TS-PRAC-02 | No answer key, explanation or model answer before an attempt | P1 | A I | `practice.e2e-spec.ts`, `practice-rls.int-spec.ts` |
| TS-PRAC-03 | A client-sent `score`, `isCorrect` or `userId` is rejected | P1 | A I | `practice.e2e-spec.ts`, `practice-rls.int-spec.ts` |
| TS-PRAC-04 | Attempts are immutable; the self-assessment is saved once | P1 | A I | `practice.e2e-spec.ts`, `practice-rls.int-spec.ts` |
| TS-PRAC-05 | History shows only your own attempts, newest first | P1 | A I E | `practice.e2e-spec.ts`, `practice-rls.int-spec.ts` |
| TS-PRAC-06 | Attempt submission is limited per user | P2 | A | `practice-rate-limit.e2e-spec.ts` |
| TS-PRAC-07 | A failed submission keeps the typed answer | P3 | E | `practice.spec.ts` |

## Admin CMS

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-ADM-01 | Every admin route is 403 for learners and 401 without a token | P1 | A | `admin.e2e-spec.ts`, `security.e2e-spec.ts` |
| TS-ADM-02 | An admin builds a course (module, lesson, exercise) and publishes it; learners see it | P1 | A I E | `admin.e2e-spec.ts`, `journey.int-spec.ts`, `journey.spec.ts` |
| TS-ADM-03 | Publishing without a published lesson in a published module is 409 | P2 | A E | `admin.e2e-spec.ts`, `admin.spec.ts` |
| TS-ADM-04 | Content in use cannot be hard-deleted (409); unused content deletes with its children | P1 | A I E | `admin.e2e-spec.ts`, `admin-rls.int-spec.ts`, `admin.spec.ts` |
| TS-ADM-05 | Slugs are unique (409 on the field) | P2 | A I E | `admin.e2e-spec.ts`, `admin.spec.ts` |
| TS-ADM-06 | Reorder needs the full list; a failure puts the old order back | P3 | A E | `admin.e2e-spec.ts`, `admin.spec.ts` |
| TS-ADM-07 | Answer keys are validated against the prompt; ids are locked after attempts | P2 | U A E | `exercise-schema.spec.ts`, `admin.e2e-spec.ts`, `admin.spec.ts` |
| TS-ADM-08 | Audit columns come from the JWT, never from the client | P2 | I | `admin-rls.int-spec.ts` |

## Dashboard and progress

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-DASH-01 | A new learner sees zeros for all seven skills | P2 | A E | `dashboard.e2e-spec.ts`, `dashboard.spec.ts` |
| TS-DASH-02 | Completed lessons and best attempts show on the dashboard and the Progress page | P1 | U A I E | `stats.spec.ts`, `dashboard.e2e-spec.ts`, `journey.*` |
| TS-DASH-03 | Streak in the learner's time zone, alive until a whole day is missed | P2 | U A I | `stats.spec.ts`, `dashboard.e2e-spec.ts`, `dashboard-rls.int-spec.ts` |
| TS-DASH-04 | Only the caller's own data, only published content | P1 | A I | `dashboard.e2e-spec.ts`, `dashboard-rls.int-spec.ts` |

## Curriculum

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-CUR-01 | The seeded curriculum is valid (counts, parsers, Vietnamese, model answers pass) | P2 | U | `curriculum.spec.ts` |
| TS-CUR-02 | The import is idempotent and keeps CMS edits unless `--update` | P2 | U | `plan.spec.ts` |

## Cross-cutting

| ID | Scenario | Priority | Levels | Automated in |
|---|---|---|---|---|
| TS-X-01 | Without a session every protected page goes to login and no protected endpoint is called | P1 | E | `journey.spec.ts` |
| TS-X-02 | Malformed ids are 400 and unknown ids 404 on every route | P2 | A | `security.e2e-spec.ts` |
| TS-X-03 | Errors always have `{ statusCode, error, message, details? }` | P2 | A | all API suites |
| TS-X-04 | Every data view has loading, error (with retry) and empty states | P2 | E | feature E2E specs |
| TS-X-05 | Language and theme switch and are remembered | P3 | E | `preferences.spec.ts` |
| TS-X-06 | No horizontal scroll on mobile; layout holds in Vietnamese and dark mode | P3 | E M | `foundation.spec.ts`, screenshot review |
