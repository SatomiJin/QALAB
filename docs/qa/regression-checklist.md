# Regression Checklist

Run before every release and after any change to auth, RLS / migrations, grading or the API contract. Copy the list into the release notes or PR and tick it off. Cases: [test-cases.md](test-cases.md).

## 1. Automated gates (all must pass)

Backend (`cd backend`):

- [ ] `npm run typecheck && npm run lint`
- [ ] `npm test` (unit: grading, progress, streak, schema, curriculum)
- [ ] `npm run test:e2e` (API, incl. the security sweeps and rate limits)
- [ ] `npm run seed:curriculum -- --dry-run` (curriculum still valid)
- [ ] Migrations pushed (`npx supabase migration list`: every local version has a remote one)
- [ ] `npm run test:int` (RLS, real auth, journey; needs `backend/.env`)

Frontend (`cd frontend`):

- [ ] `npm run typecheck && npm run lint`
- [ ] `npm test`
- [ ] `npm run test:e2e` (desktop + mobile, incl. `journey.spec.ts`)

## 2. What else to run when something changes

| You changed | Also check |
|---|---|
| A route, DTO or guard | `security.e2e-spec.ts` lists it automatically; if it is meant to be public, add it to `PUBLIC` there on purpose. Update `docs/api.md`, `frontend/src/types/api.ts`, `mock-api.ts` |
| A migration, policy or grant | the matching `*-rls.int-spec.ts`; a test for own row / other user's row / admin / protected column |
| Grading or exercise schemas | `grading.spec.ts`, `exercise-schema.spec.ts`, `curriculum.spec.ts` (model answers must still pass) |
| Auth flow or tokens | `auth.e2e-spec.ts`, `auth-flow.int-spec.ts`, `auth.spec.ts`, TC-SEC-09 … 12 |
| Visibility of content | `learning.e2e-spec.ts`, `learning-rls`, `admin-rls`, TC-E2E-10 |
| Dashboard views | `dashboard.e2e-spec.ts`, `dashboard-rls`, `stats.spec.ts` |
| UI text or layout | EN + VI, light + dark, desktop + mobile screenshots |

## 3. Manual smoke (about 15 minutes, on the deployed preview)

Learner:

- [ ] Register with a real mailbox; the verification email arrives and its link signs you in (TC-MAN-01)
- [ ] Dashboard shows the seven skills; *Continue* opens a lesson
- [ ] Read a lesson to the end; *Mark as complete*; the course page shows it completed
- [ ] Answer one multiple choice and one free-text exercise; the result, explanation / model answer and self-assessment show
- [ ] Progress page shows the lesson and both exercises
- [ ] Sign out, sign in again: everything above is still there
- [ ] Switch to Vietnamese and dark mode: labels translated, QA terms in English, nothing overflows
- [ ] On a phone (or 390 px wide): navigation drawer works, no horizontal scroll

Admin:

- [ ] Create a draft course with a module and lesson; it is not in the learner catalogue
- [ ] Publish it; it appears for the learner; unpublish it; it disappears (404 on its URL)
- [ ] Deleting content a learner has used is blocked with "archive instead"
- [ ] A learner account opening `/admin` gets the no-access page

Security spot checks (browser devtools or curl):

- [ ] No Supabase URL or key in the frontend bundle or network calls (only the API base URL)
- [ ] An exercise response before answering contains no `correct`, `explanation` or `modelAnswer`
- [ ] Six quick wrong logins give `429` with `Retry-After`
- [ ] `GET /api/v1/me` without a token is `401`

## 4. Sign-off

- [ ] No open Critical / High defect; open Medium findings listed in [test-plan.md § 8](test-plan.md#8-findings-from-phase-7) are accepted
- [ ] Test data cleaned up: no `qalab-it-*` users or courses left in the project
- [ ] `docs/testing-strategy.md` updated with new coverage
