# Architecture

## Overview

```text
┌──────────────┐   HTTPS (JSON)   ┌──────────────┐        ┌──────────────────────┐
│   Frontend   │ ───────────────> │ Backend API  │ ─────> │ Supabase Auth        │
│ React + Vite │  /api/v1/*       │   NestJS     │        │ Supabase PostgreSQL  │
│   (Vercel)   │  Bearer JWT      │ (Render/…)   │        │ (RLS enabled)        │
└──────────────┘                  └──────────────┘        └──────────────────────┘
```

* The frontend has no Supabase SDK and no Supabase keys. It only knows `VITE_API_BASE_URL`.
* The backend wraps Supabase Auth (`/auth/*`) and serves all data.
* The backend verifies the JWT on every protected request and derives `user_id` from it.
* Queries run through a per-request Supabase client carrying the user's JWT, so RLS is enforced as a second layer.
* The service-role key lives only in the backend and is used only for grading (reading answer keys, writing graded attempts), session revocation, and writing the machine-translation cache.

## Request pipeline (backend)

1. `helmet` — security headers
2. CORS — only origins in `CORS_ORIGIN`
3. Global prefix `/api/v1`
4. Guards — `JwtAuthGuard` (global; verifies the JWT against the Supabase JWKS; `@Public()` opts out), `RolesGuard` (`@Roles()`; role read from `profiles`), `RateLimitGuard` via `@RateLimit('auth')` on `/auth/*` (per IP and endpoint) and `@RateLimit('attempts')` on attempt submission (per user)
5. `ValidationPipe` — whitelist + reject unknown fields → `400` with `details`
6. Controller → service → Supabase
7. `AllExceptionsFilter` — converts every error to `{ statusCode, error, message, details? }`

## Request pipeline (frontend)

1. Components call TanStack Query hooks (`features/*`).
2. Hooks call the shared `api` client (`lib/http.ts`).
3. `api` attaches `Authorization: Bearer <accessToken>` when a token exists.
4. Before sending: if the access token is missing (after a reload) or expires within 30 s, refresh first. On `401`: one shared refresh call, retry once, otherwise clear tokens and notify the unauthorized handler (→ login).
5. Non-2xx responses become `ApiError` with the backend error shape; network failures are `status 0`.
6. Queries retry only network/5xx errors.

## Configuration

Env variables are validated at startup (`src/config/env.validation.ts`). Invalid config stops the process with a list of problems.

## Status

| Phase | Backend | Frontend |
|---|---|---|
| 0 — Foundation | Done | Done |
| 1 — Authentication & Profile | Done | Done |
| 2 — Learning (learner side) | Done | Done |
| 3 — Practice | Done | Done |
| 4 — Admin CMS | Done | Done |
| 5 — Dashboard & Progress | Done | Done |
| 6 — Curriculum | Done (content + importer) | No change (content comes from the API) |
| 7 — QA | Done: security sweeps, journey through the real stack, QA documents ([docs/qa](qa/test-plan.md)) | Done: journey and no-session E2E |

## Authentication

* Access token in memory only; refresh token in `localStorage` (`qalab.refreshToken`). On load, `AuthProvider` exchanges the refresh token for a session (`checking → signedIn | signedOut`).
* Refresh tokens rotate (single use). The start-up restore and the API client share one in-flight refresh, so a token is never sent twice.
* Route guards: `RequireAuth` (→ `/auth/login?redirect=…`), `RequireAdmin` (no-access page), `GuestOnly` (login, register, forgot password). They are UX only; the API and RLS enforce access.
* Email links (`/auth/verify`, `/auth/reset-password`) open the frontend with `token_hash`; the frontend posts it to the API. Contracts: [api.md](api.md). Tables and policies: [database.md](database.md). Tests: [testing-strategy.md](testing-strategy.md).

## Learning (Phase 2)

* Backend module `src/learning/`: `ContentRepository` (skills/courses/modules/lessons, published only) and `LessonProgressRepository`, both as the user (RLS). `LearningService` assembles outlines; the pure rules (progress summary, next lesson, neighbours, forward-only progress, continue choice) live in `outline.ts` and are unit-tested.
* Visibility is checked twice: RLS (content and every parent published) and an explicit `status = 'published'` filter, so admins get the learner view on learner endpoints.
* Frontend `features/learning/`: `learning-api.ts`, TanStack Query hooks in `queries.ts` (`learningKeys`), pages for the catalogue (`/learning`), a course (`/learning/courses/:slug`) and a lesson (`/learning/lessons/:lessonId`). The lesson page reports the visit on open and reading progress in 10-point steps while scrolling (`useReadingProgress`); the backend and a DB trigger keep progress forward-only.
* Lesson Markdown is rendered by `react-markdown` + `remark-gfm` without raw HTML.
* `/courses` is paginated (20/50/100). The Learning page keeps filter, page and size in the URL (`?skill=&page=&pageSize=`) and remembers it per tab, so the back buttons on course and lesson pages return to the same list.
* Course, lesson and continue pages show "Learning › Course › Lesson" (`PageTrail`) with a back button to the level above.

## Content translation

* Content is authored in English. With `?lang=vi` the backend module `src/translation/` serves it in Vietnamese:
  1. `ContentTranslationService` looks up `content_translations` (as the user, RLS) and keeps rows whose `source_hash` matches the current text: `manual` rows first (written by a person, e.g. the seeded sample course), then `google` rows made by the current pipeline.
  2. Missing texts go to the `Translator` (`GoogleTranslator`, Cloud Translation API v2, `format: html`, key in the `X-Goog-Api-Key` header). `markdown-translate.ts` sends running text only, as HTML fragments, and marks code, URLs and QA glossary terms (`qa-glossary.ts`) `notranslate`; it rebuilds the Markdown afterwards.
  3. New machine translations are saved with the service role. The response says `translation: manual` (all human), `machine` (some machine) or `unavailable`.
* The provider is optional: without `GOOGLE_TRANSLATE_API_KEY` only manual translations are served. Any failure (no key, provider error, cache unreadable) falls back to English with `translation: unavailable`; the request never fails because of translation.
* The frontend requests content in the UI language (`useContentLanguage`) and includes it in query keys. The lesson page can switch to the English original. A note explains machine translation.

## Practice (Phase 3)

* Backend module `src/practice/`: `ExercisesRepository` (as the user, published only), `ExerciseAnswersRepository` (service role: answer keys), `AttemptsRepository` (reads and the self-assessment as the user; graded attempts inserted with the service role). `PracticeService` checks visibility (exercise + lesson chain), validates the answer, grades, stores and builds the review. The pure parts are `exercise-schema.ts` (shapes and validation of prompt, answer key, answer and self-assessment per type) and `grading.ts` (deterministic scoring), both unit-tested.
* Attempt flow: `POST /exercises/:id/attempts` → visible? (404) → `parseAnswer` (400 with `details`) → answer key (service role) → `grade` → insert (service role, `user_id` from the JWT) → translate the review (after the insert: review translations are readable only once you have an attempt) → `{ attempt, review }`.
* Frontend `features/practice/`: API + TanStack Query hooks (`practiceKeys`), `kinds.ts` (tab ↔ types, verdicts, URL params), `answers.ts` (form ↔ request, backend errors → fields), pages `PracticeListPage` (one per tab; filters and page in the URL) and `ExercisePage` (`/practice/exercises/:id`: question, `AnswerForm`, `ResultView`, `AttemptHistory`), and `LessonExercises` on the lesson page.
* The shared pager is `components/ListPager.tsx` (Learning and Practice lists).

## Admin CMS (Phase 4)

* Backend module `src/admin/`: `AdminCoursesController` (courses, modules) and `AdminLessonsController` (lessons, exercises), both `@Roles('admin')`. `AdminService` / `AdminExercisesService` load the course tree, apply the rules and map to DTOs; the pure rules are in `content-rules.ts` (in use, can publish, complete reorder, locked prompt ids) and unit-tested. `AdminContentRepository` reads and writes every status **as the admin** (`forUser`), so RLS `is_admin()` checks every write a second time; reorders and usage go through the SQL functions `reorder_content` and `content_usage`. Exercise prompt data and answer keys are validated with the grader's own parsers (`practice/exercise-schema.ts`).
* Unique-slug (`23505`) and restrict-FK (`23503`) errors become `409` (`common/errors/pg-error.ts`).
* Frontend `features/admin/`: `admin-api.ts`, `queries.ts` (`adminKeys`, `useAdminMutation`: returned details go into their cache, then every admin / learning / practice query is refreshed), pages `AdminCoursesPage` (filters in the URL, New course dialog, course reorder when one skill is shown), `AdminCoursePage` (details, publish / unpublish / archive / delete, outline with modules and lessons), `AdminLessonPage` (fields, `MarkdownEditor` with live preview, exercises), `AdminExercisePage` (per-type answer-key form; `exercise-form.ts` converts form and API shapes), `AdminLessonPreviewPage` (preview as learner). Reordering is `SortableList` (dnd-kit: pointer, touch, keyboard; plus up / down buttons), shown at once and put back if saving fails.

## Curriculum (Phase 6)

* The curriculum is data, not code: `backend/seed/curriculum/<course>/` holds `course.json` (modules and lessons in order) and `lessons/<slug>.{en,vi}.md` + `<slug>.exercises.json`, English and Vietnamese side by side. Outline: [curriculum.md](curriculum.md); format: `backend/seed/README.md`.
* `backend/src/curriculum/`: `curriculum.ts` reads and validates the files (reusing `parsePrompt` / `parseAnswerKey` and the grader's concept matching), `rows.ts` maps them to rows and decides which translations to write, `plan.ts` decides inserts / updates / skips against the database (reusing the CMS rule `lockedPromptErrors`), `import-curriculum.ts` is the CLI (`npm run seed:curriculum`, service role). After the import, the Admin CMS edits the content; nothing in the frontend knows the curriculum.

## Dashboard and progress (Phase 5)

* Derived data only: three **security invoker** views (`v_user_exercise_results`, `v_user_skill_progress`, `v_user_activity`) and `activity_days(tz)` read the caller's own rows through RLS; nothing is stored.
* Backend module `src/dashboard/`: `DashboardController` (`GET /dashboard`, `GET /progress`), `DashboardService` and `ProgressService`, `DashboardRepository` (the views, as the user, always filtered on the user id because an admin's RLS shows everyone), pure rules in `stats.ts` (streak, weak skills / concepts, percent, average; unit-tested). It reuses `LearningService.loadCatalogue` / `loadCoursePage`, `chooseContinue`, the shared mapping in `learning/mapping.ts` (text refs, `toCourseSummary`, `toContinueItem`) and `ExercisesRepository` (exported by `PracticeModule`). One translation call per response.
* Frontend `features/dashboard/`: `dashboard-api.ts`, `queries.ts` (`dashboardKeys`; `staleTime: 0`, so every visit refetches instead of every other feature's mutation invalidating it), `DashboardPage` (Continue block, `SummaryFigures` with the 14-day streak strip, `SkillTable`, `RetestSection`, `ActivityLog`) and `ProgressPage` (skill tabs, `CourseReport` per course, pager). The browser's time zone is sent as `tz`. `ContinueBlock` and `SkillFilter` moved from the Learning page to `features/learning/` to be shared.
