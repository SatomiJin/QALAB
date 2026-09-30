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
* The service-role key lives only in the backend and is used only for grading (answer keys), session revocation, and writing the machine-translation cache.

## Request pipeline (backend)

1. `helmet` — security headers
2. CORS — only origins in `CORS_ORIGIN`
3. Global prefix `/api/v1`
4. Guards — `JwtAuthGuard` (global; verifies the JWT against the Supabase JWKS; `@Public()` opts out), `RolesGuard` (`@Roles()`; role read from `profiles`), `ThrottlerGuard` on `/auth/*`
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
