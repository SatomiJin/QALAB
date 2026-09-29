# QA Learning Lab — Project Specification

## Goal

Build a personal QA/Software Testing learning platform.

The owner already has strong technical/programming experience but wants to systematically learn QA/QC/Software Testing fundamentals and develop stronger QA reasoning.

The platform must support:

* Authentication with email/password (phone OTP optional, see Authentication)
* Persistent user learning progress
* QA learning curriculum: courses, modules, lessons, exercises
* **Admin CMS to create and manage courses dynamically from the frontend**
* Quizzes, test-case writing practice, bug-report practice, scenario challenges
* Progress dashboard and skill tracking
* A dedicated Backend API that the Frontend calls for all data
* Supabase PostgreSQL + Supabase Auth + Row Level Security
* Playwright-ready architecture

This is primarily a personal learning platform, not a social platform.

Do not over-engineer the project.

---

# Architecture

```text
┌──────────────┐                        ┌─────────────┐        ┌───────────────────────┐
│   Frontend   │  HTTPS (JSON)          │ Backend API │        │ Supabase Auth         │
│ React + Vite │ ─────────────────────> │  (NestJS)   │ ─────> │                       │
│              │  /auth/* (public)      │             │        │ Supabase PostgreSQL   │
│              │  /* + Bearer JWT       │             │        │ (RLS enabled)         │
└──────────────┘                        └─────────────┘        └───────────────────────┘
```

Rules:

1. The Frontend talks **only to the Backend API**. It has no Supabase SDK and no Supabase keys.
2. Authentication (register, login, logout, refresh, email verification, forgot/reset password) goes through Backend `/auth/*` endpoints, which wrap Supabase Auth.
3. The Frontend **never queries the database directly**. All data goes through the Backend API.
4. After login, the Frontend sends the access token as `Authorization: Bearer <jwt>` on every protected API call, and uses `/auth/refresh` to renew it.
5. The Backend verifies the JWT, derives `user_id` from the token, and **never trusts a `user_id` from the request body/query**.
6. The Backend creates a **per-request Supabase client scoped to the user's JWT**, so RLS still applies (defense in depth).
7. The service-role key exists **only in the Backend** and is used only where strictly required (e.g. reading exercise answer keys for grading, revoking sessions on logout).
8. Exercise answer keys are never returned by any API response.
9. Scoring is always computed by the Backend. The client never submits a score.

---

# Repository Structure

`QALAB/` is the root folder containing both Frontend and Backend as separate projects.

```
QALAB/
├── frontend/                  # React + TypeScript + Vite + Ant Design + SCSS
│   ├── src/
│   │   ├── app/               # App root, providers, router
│   │   ├── components/        # Shared UI components
│   │   ├── layouts/           # MainLayout, AdminLayout, AuthLayout
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── learning/
│   │   │   ├── practice/
│   │   │   ├── progress/
│   │   │   ├── profile/
│   │   │   └── admin/         # Course/module/lesson/exercise management
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts         # HTTP client, attaches JWT, auto-refresh on 401
│   │   │   └── auth-storage.ts # Token storage helpers
│   │   ├── types/             # API types (shared contract with backend DTOs)
│   │   ├── utils/
│   │   └── styles/
│   ├── tests/
│   │   └── e2e/               # Playwright
│   ├── public/
│   ├── .env.example           # VITE_API_BASE_URL only
│   └── package.json
│
├── backend/                   # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/            # Env validation
│   │   ├── common/            # Filters, pipes, interceptors, supabase client factory
│   │   ├── auth/              # /auth/* endpoints, JwtAuthGuard, RolesGuard, @CurrentUser(), @Roles()
│   │   ├── profile/
│   │   ├── skills/
│   │   ├── courses/
│   │   ├── modules/
│   │   ├── lessons/
│   │   ├── exercises/         # Includes grading logic
│   │   ├── progress/
│   │   ├── dashboard/
│   │   └── admin/             # Admin CRUD controllers
│   ├── supabase/
│   │   ├── config.toml
│   │   ├── migrations/        # All DB changes go here
│   │   └── seed.sql           # Minimal seed (skills, one sample course)
│   ├── seed/                  # Versioned curriculum data (JSON/Markdown) + import script
│   ├── test/
│   │   ├── setup-env.ts       # Test env (unit specs live next to code in src/)
│   │   ├── api/               # Supertest API tests
│   │   └── db/                # pgTAP RLS tests
│   ├── .env.example           # SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PORT, CORS_ORIGIN, FRONTEND_URL, SWAGGER_ENABLED
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── testing-strategy.md
│   └── curriculum.md
│
├── CLAUDE.md
└── README.md
```

No root-level monorepo tooling is required. Each project installs and runs independently.

---

# Technology

Frontend:

* React, TypeScript (strict), Vite
* Ant Design, SCSS
* React Router
* TanStack Query (server state, caching, loading/error states)
* A Markdown renderer for lesson content, and a Markdown editor for the admin CMS
* i18next + react-i18next (UI in English and Vietnamese)
* Light / Dark / System theme (Ant Design dark algorithm + CSS variables)

Backend:

* NestJS (TypeScript strict)
* class-validator / class-transformer for DTO validation
* Swagger / OpenAPI (`/api/docs`) — also used as a target for API-testing practice
* supabase-js (auth wrapper + per-request user-scoped client + backend-only service client)
* @nestjs/throttler (rate limiting for auth and attempt endpoints)

Database / Auth:

* Supabase PostgreSQL
* Supabase Auth
* Row Level Security
* Supabase CLI for local development and migrations (requires Docker)

Deployment:

* Frontend: Vercel (Root Directory = `frontend`)
* Backend: Render / Railway / Fly.io (long-running Node server)
* Database: Supabase Cloud

Testing:

* Backend: Vitest (unit, colocated `src/**/*.spec.ts`), Vitest + Supertest (API, `test/**/*.e2e-spec.ts`), pgTAP (RLS)
* Frontend: Playwright (E2E)

---

# Core Learning Tracks (Skills)

A **skill** is the unit of progress tracking. Each course belongs to exactly one skill.

| Code | Skill |
|---|---|
| `fundamentals` | QA Fundamentals (incl. SDLC, STLC) |
| `testing_types` | Testing Types |
| `test_design` | Test Design Techniques |
| `test_docs` | Test Documentation |
| `defect_mgmt` | Defect Management |
| `api_testing` | API Testing |
| `automation` | Automation Testing |

This single list is used for: Learning navigation, dashboard skill progress, and course categorization.

V1 curriculum target:

* ~40 lessons
* ~20 modules
* ~100 exercises

Do not generate the entire curriculum before the architecture is stable.

---

# Roles

| Role | Can do |
|---|---|
| `learner` (default) | Read published content, track own progress, submit attempts, manage own profile |
| `admin` | Everything a learner can + create/edit/publish/archive/reorder courses, modules, lessons, exercises; view draft content |

* Role is stored in `profiles.role`.
* Role can only be changed directly in the database (SQL / Supabase dashboard). There is **no API to change roles**.
* Admin is enforced in **both** layers: `RolesGuard` in the Backend and `is_admin()` in RLS policies.

---

# Authentication

All authentication goes through the Backend. The Backend wraps Supabase Auth; the Frontend never calls Supabase.

| Flow | Frontend | Backend |
|---|---|---|
| Register | Register form → `POST /auth/register` | `supabase.auth.signUp`, redirect URL = `FRONTEND_URL/auth/verify` |
| Email verification | User clicks email link → FE `/auth/verify?token_hash=...&type=signup` → `POST /auth/verify-email` | `supabase.auth.verifyOtp({ token_hash, type })`, returns session |
| Login | Login form → `POST /auth/login` | `supabase.auth.signInWithPassword`, returns tokens + user |
| Refresh | On 401 / before expiry → `POST /auth/refresh` | `supabase.auth.refreshSession`, returns new tokens |
| Logout | `POST /auth/logout` then clear local tokens | Revoke the user's session (service client `auth.admin.signOut`) |
| Forgot password | Email form → `POST /auth/forgot-password` | `supabase.auth.resetPasswordForEmail`, redirect = `FRONTEND_URL/auth/reset-password` |
| Reset password | FE `/auth/reset-password?token_hash=...` → new password form → `POST /auth/reset-password` | `verifyOtp({ type: 'recovery' })` then update password |

Token handling:

* Login/verify/refresh respond with `{ accessToken, refreshToken, expiresAt, user }`.
* V1: Frontend keeps the access token in memory and the refresh token in `localStorage` (same exposure as the default Supabase SDK). Moving the refresh token to an httpOnly cookie is a possible later hardening step (requires FE and BE on the same site or `SameSite=None; Secure`).
* `lib/api.ts` retries once after a successful refresh; if refresh fails, clear tokens and redirect to login.

Supabase configuration:

* Email templates (confirm signup, reset password) must use `{{ .TokenHash }}` links pointing to the Frontend routes above.
* Allowed redirect URLs include the Frontend URL(s).

Backend rules for auth endpoints:

* Validate email format and password policy (min 8 chars) in DTOs.
* Login errors are generic (`Invalid email or password`), with no user enumeration.
* Forgot password always returns `200`, whether or not the email exists.
* Rate limit `/auth/*` (e.g. 5 requests/minute per IP for login, register, forgot-password).
* Never log passwords or tokens.

Also handled by the Backend:

* JWT verification on every protected endpoint
* Profile read/update (`/me`)
* Auto-provisioning of the `profiles` row via DB trigger on `auth.users` insert (`display_name` passed as signup metadata)

Phone OTP:

* Optional in V1. Requires an SMS provider (Twilio/Vonage/etc.) configured in Supabase, which has a cost.
* Implement only after email auth is complete and a provider is chosen. Otherwise move to V2.

Never store raw passwords.

Never expose Supabase service-role credentials to the Frontend.

---

# User Profile

Store:

* id (= auth user id)
* display_name
* experience_level
* learning_goals
* role
* created_at
* updated_at

Experience levels:

* `beginner` — Beginner
* `some_qa` — Some QA experience
* `working_qa` — Working QA/QC
* `automation_qa` — Automation QA

---

# Language & Theme

UI language:

* English (`en`) and Vietnamese (`vi`). English is the source of truth for translation keys.
* Initial language: saved choice → browser language → English. The choice is saved per browser.
* Every UI string goes through i18n keys (`frontend/src/i18n/locales/*.ts`), which are type-checked. No hardcoded UI text in components.
* Standard QA terms (Test Case, Bug Report, Severity, Priority, Smoke, Regression…) stay in English in the Vietnamese UI, because that is what learners use at work.
* Ant Design built-in texts follow the selected language.
* Backend validation messages are English. The frontend translates common errors (network, generic) and shows backend messages for the rest. Learning content language is decided in Phase 6.

Theme:

* Light, Dark, or System (follows the OS). Default: System. Saved per browser.
* Applied before first paint (inline script in `index.html`) to avoid a flash.
* Colors come from theme tokens (Ant Design theme + CSS variables). No hardcoded colors in components.

---

# Main Navigation

Learner:

* Dashboard
* Learning (grouped by skill)
* Practice
  * Quiz
  * Test Case Practice
  * Bug Report Practice
  * Scenario Challenge
* Progress
* Profile

Admin (visible only to admins):

* Admin → Courses
* Admin → Course detail (modules, lessons, exercises)

---

# Dashboard

Show:

* Overall progress
* Lessons completed
* Exercises completed
* Average score
* Learning streak
* Continue learning
* Skill progress (per skill in the table above)
* Weak areas
* Recent activity

All dashboard values are **derived** from `lesson_progress` and `exercise_attempts` (via SQL views or backend queries). Do not store derived aggregates unless a performance problem is proven.

---

# Learning Architecture

Hierarchy:

```
Skill
└── Course
    └── Module
        └── Lesson
            ├── Content (Markdown: explanation, examples, notes)
            └── Exercises (practice + quiz)
```

Lessons must track:

* Not started / In progress / Completed
* Started at
* Last accessed
* Completion percentage

Users must be able to resume where they stopped.

---

# Admin CMS (Dynamic Course Management)

Course content is managed entirely from the Frontend admin area. Curriculum must never be hardcoded in React components.

## Features

Courses:

* List all courses (all statuses) with filters by skill and status
* Create / edit course: title, slug (auto-generated, editable, unique), description, skill, cover color/icon (optional)
* Publish / unpublish / archive
* Reorder courses within a skill

Modules:

* Create / edit / delete modules inside a course
* Reorder modules (drag-and-drop)

Lessons:

* Create / edit lessons inside a module
* Markdown editor with live preview
* Estimated minutes
* Draft / published status
* Reorder lessons
* "Preview as learner"

Exercises:

* Create / edit exercises inside a lesson
* Type-specific form per exercise type (see Practice Types)
* Answer key edited in the admin form, stored separately (`exercise_answers`)
* Explanation shown after submission
* Difficulty
* Reorder exercises

## Content Lifecycle

* Status: `draft` → `published` → `archived`
* Learners only see `published` content whose parents are also `published`.
* Content that already has learner progress or attempts **cannot be hard-deleted**; it can only be archived.
* Hard delete is allowed only for content with no progress/attempts, and requires confirmation in the UI.
* Every content table stores `created_by`, `updated_by`, `created_at`, `updated_at`.

## Validation

* Slugs: lowercase, `a-z0-9-`, unique within their scope
* Required fields enforced in both DTOs and DB constraints
* Exercise answer key must match the exercise type schema (validated in the Backend)
* A course cannot be published if it has no published lessons (warning, not hard block — decide during implementation)

---

# Practice Types

Implement:

| Type | Learner input | Answer key (`exercise_answers.answer_data`) | Grading |
|---|---|---|---|
| `multiple_choice` | selected option id(s) | correct option id(s) | exact match |
| `classification` | item → category mapping | correct mapping | % of correctly classified items |
| `test_case` | structured test case form | expected concepts + required fields | required fields present + concept keyword coverage |
| `bug_report` | structured bug report form | expected severity/priority + expected concepts | field checks + severity/priority match + concept coverage |
| `scenario` | free text / structured answer | expected concepts + rubric | concept coverage + self-assessment rubric |

Public exercise data (question, options, items, categories) lives in `exercises.prompt_data` and is safe to return to learners.

Examples of QA concepts to cover:

* Equivalence Partitioning
* Boundary Value Analysis
* Decision Tables
* State Transition
* Use Case Testing
* Error Guessing
* Severity vs Priority
* Regression vs Retesting
* Smoke vs Sanity
* Positive vs Negative testing

---

# Exercise Evaluation

V1 must NOT depend on AI.

Use deterministic evaluation.

Example answer key:

```json
{
  "expectedConcepts": [
    { "concept": "boundary", "keywords": ["boundary", "edge", "limit"] },
    { "concept": "minimum", "keywords": ["min", "minimum", "lowest"] },
    { "concept": "maximum", "keywords": ["max", "maximum", "highest"] },
    { "concept": "invalid", "keywords": ["invalid", "negative", "out of range"] }
  ]
}
```

Known limitation: keyword matching for free text is approximate. For free-text types, show the model answer + a self-assessment checklist after submission, and store the self-assessment together with the automatic score.

All submissions are stored in `exercise_attempts`, including the raw answer and grading feedback.

V2 may introduce AI-based evaluation.

---

# Test Case Practice

Users should be able to create:

* Test Case ID
* Title
* Preconditions
* Test Data
* Steps
* Expected Result
* Priority
* Test Type

---

# Bug Report Practice

Users should be able to create:

* Bug ID
* Title
* Environment
* Preconditions
* Steps to Reproduce
* Actual Result
* Expected Result
* Severity
* Priority
* Attachment (V1: optional text/URL field; file upload via Supabase Storage deferred)

---

# Defect Management Curriculum

Teach:

* Bug lifecycle
* New
* Assigned
* In Progress
* Fixed
* Retest
* Verified
* Closed
* Rejected
* Duplicate
* Cannot Reproduce
* Won't Fix
* Deferred
* Reopened

Teach Severity and Priority separately.

Do not treat them as synonyms.

---

# API Testing Curriculum

Teach:

* HTTP
* GET, POST, PUT, PATCH, DELETE
* Status codes
* Headers
* Query parameters
* Path parameters
* Request body
* Response body
* Authentication
* Negative testing
* Boundary testing
* Schema validation
* Contract testing

The platform's own Backend API (Swagger at `/api/docs`) can be used as a hands-on practice target.

---

# Automation Curriculum

Teach:

* What should be automated
* What should not be automated
* Automation pyramid
* UI automation
* API automation
* Test data
* Fixtures
* Page Object Model
* Assertions
* Wait strategies
* Flaky tests
* Test isolation
* CI/CD

Playwright should be taught as an implementation tool, not as the foundation of QA knowledge.

---

# Backend API

Base path: `/api/v1`

## Conventions

* JSON only
* All endpoints require a valid JWT except `GET /health` and the public `/auth/*` endpoints
* Validation errors → `400`, unauthenticated → `401`, forbidden → `403`, not found → `404`, conflict (e.g. duplicate slug) → `409`
* Error response shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human readable message",
  "details": [{ "field": "slug", "message": "must be unique" }]
}
```

* List endpoints support pagination where lists can grow (`?page=&pageSize=`)
* IDs are UUIDs; invalid UUIDs return `400`, unknown IDs return `404`

## Auth endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, displayName }` → `201`, verification email sent |
| POST | `/auth/verify-email` | public | `{ tokenHash, type }` → session |
| POST | `/auth/resend-verification` | public | `{ email }` → always `200` |
| POST | `/auth/login` | public | `{ email, password }` → session |
| POST | `/auth/refresh` | public | `{ refreshToken }` → new session |
| POST | `/auth/logout` | JWT | Revoke session → `204` |
| POST | `/auth/forgot-password` | public | `{ email }` → always `200` |
| POST | `/auth/reset-password` | public | `{ tokenHash, newPassword }` → `200` |
| POST | `/auth/change-password` | JWT | `{ currentPassword, newPassword }` → `200` |

## Learner endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (public) |
| GET | `/me` | Current user profile (incl. role) |
| PATCH | `/me` | Update display_name, experience_level, learning_goals |
| GET | `/skills` | List skills |
| GET | `/courses` | Published courses (`?skill=`) |
| GET | `/courses/:slug` | Course detail with published modules + lessons + user progress |
| GET | `/lessons/:id` | Lesson content + exercises (no answer keys) |
| POST | `/lessons/:id/progress` | Start / update progress / complete lesson |
| GET | `/exercises` | Practice list (`?type=&skill=&difficulty=`) |
| GET | `/exercises/:id` | Exercise (no answer key) |
| POST | `/exercises/:id/attempts` | Submit answer → backend grades → returns score, feedback, explanation |
| GET | `/exercises/:id/attempts` | Current user's attempt history for an exercise |
| GET | `/progress` | Per-course / per-lesson progress |
| GET | `/dashboard` | Aggregated dashboard data |
| GET | `/continue` | Last accessed lesson to resume |

## Admin endpoints (role = admin)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/courses` | All courses, any status |
| POST | `/admin/courses` | Create course |
| GET | `/admin/courses/:id` | Course with full tree (modules, lessons, exercises) |
| PATCH | `/admin/courses/:id` | Update course |
| POST | `/admin/courses/:id/publish` | Publish |
| POST | `/admin/courses/:id/archive` | Archive |
| DELETE | `/admin/courses/:id` | Hard delete (only if no progress/attempts) |
| PATCH | `/admin/courses/reorder` | Reorder `[ { id, orderIndex } ]` |
| POST | `/admin/courses/:id/modules` | Create module |
| PATCH | `/admin/modules/:id` | Update module |
| DELETE | `/admin/modules/:id` | Delete module (rules as above) |
| PATCH | `/admin/courses/:id/modules/reorder` | Reorder modules |
| POST | `/admin/modules/:id/lessons` | Create lesson |
| GET | `/admin/lessons/:id` | Lesson incl. draft content |
| PATCH | `/admin/lessons/:id` | Update lesson |
| DELETE | `/admin/lessons/:id` | Delete lesson (rules as above) |
| PATCH | `/admin/modules/:id/lessons/reorder` | Reorder lessons |
| POST | `/admin/lessons/:id/exercises` | Create exercise + answer key |
| GET | `/admin/exercises/:id` | Exercise incl. answer key |
| PATCH | `/admin/exercises/:id` | Update exercise + answer key |
| DELETE | `/admin/exercises/:id` | Delete exercise (rules as above) |
| PATCH | `/admin/lessons/:id/exercises/reorder` | Reorder exercises |

Full request/response contracts live in Swagger and `docs/api.md`.

---

# Database

Use Supabase PostgreSQL. All changes via migrations in `backend/supabase/migrations`.

## Enums

* `user_role`: `learner`, `admin`
* `experience_level`: `beginner`, `some_qa`, `working_qa`, `automation_qa`
* `content_status`: `draft`, `published`, `archived`
* `lesson_status`: `not_started`, `in_progress`, `completed`
* `exercise_type`: `multiple_choice`, `classification`, `test_case`, `bug_report`, `scenario`
* `difficulty`: `easy`, `medium`, `hard`

## Tables

### profiles

* id — uuid PK, FK → `auth.users(id)` on delete cascade
* display_name
* experience_level
* learning_goals — text[]
* role — `user_role`, default `learner`
* created_at, updated_at

Created automatically by a trigger on `auth.users` insert.

### skills

* id — uuid PK
* code — unique
* name
* description
* order_index

### courses

* id
* skill_id — FK → skills
* title
* slug — unique
* description
* status — `content_status`, default `draft`
* order_index
* created_by, updated_by — FK → profiles
* created_at, updated_at

### modules

* id
* course_id — FK → courses
* title
* description
* status
* order_index
* created_by, updated_by, created_at, updated_at

### lessons

* id
* module_id — FK → modules
* title
* slug — unique within module
* content_md — Markdown
* estimated_minutes
* status
* order_index
* created_by, updated_by, created_at, updated_at

### exercises

* id
* lesson_id — FK → lessons
* type — `exercise_type`
* question
* prompt_data — jsonb (options, items, categories, form hints; safe to show)
* difficulty
* explanation — shown after submission
* status
* order_index
* created_by, updated_by, created_at, updated_at

### exercise_answers

* exercise_id — PK, FK → exercises on delete cascade
* answer_data — jsonb (answer key / expected concepts / rubric)
* updated_at

**No SELECT policy for learners.** Only readable by the Backend service role and admins.

### lesson_progress

* id
* user_id — FK → profiles
* lesson_id — FK → lessons
* status — `lesson_status`
* progress_percent — 0..100 (check constraint)
* started_at, completed_at, last_accessed_at
* unique (user_id, lesson_id)

### exercise_attempts

* id
* user_id — FK → profiles
* exercise_id — FK → exercises
* answer — jsonb
* score — numeric 0..100
* is_correct — boolean
* feedback — jsonb (matched/missed concepts, per-field results)
* self_assessment — jsonb, nullable
* attempted_at

## Views (derived data)

* `v_user_skill_progress` — per user per skill: completed lessons / total published lessons, average score
* `v_user_activity` — union of lesson progress events and attempts, for recent activity and streak
* Weak areas: skills/concepts with lowest average score (computed in Backend from attempts + feedback)

## Indexes

* FKs: `courses.skill_id`, `modules.course_id`, `lessons.module_id`, `exercises.lesson_id`
* `lesson_progress (user_id, last_accessed_at desc)`
* `exercise_attempts (user_id, attempted_at desc)`, `exercise_attempts (exercise_id)`
* `(parent_id, order_index)` on content tables

---

# Security

RLS is mandatory on every table.

Helper: `is_admin()` — `security definer` SQL function that checks `profiles.role = 'admin'` for `auth.uid()`.

Policies:

| Table | Learner | Admin |
|---|---|---|
| profiles | select/update own row (`id = auth.uid()`), cannot change `role` | select all |
| skills | select | all |
| courses / modules / lessons / exercises | select where `status = 'published'` | all |
| exercise_answers | none | all |
| lesson_progress | select/insert/update own (`user_id = auth.uid()`) | select all |
| exercise_attempts | select/insert own (`user_id = auth.uid()`), no update/delete | select all |

Backend rules:

* `JwtAuthGuard` on all routes except `/health` and public `/auth/*` routes
* `RolesGuard` + `@Roles('admin')` on all `/admin/*` routes
* `user_id` always taken from the verified JWT
* The service-role client is used only for grading (reading `exercise_answers`) and nothing else a user-scoped client could do
* CORS restricted to the Frontend origin
* Rate limiting on `/auth/*` and attempt submission
* Never log tokens or secrets

Never expose service-role keys in Frontend code or in any API response.

---

# Development Rules

1. TypeScript strict mode in both projects.
2. Avoid `any` unless explicitly justified.
3. Do not expose service-role credentials.
4. All tables require RLS.
5. Never trust client-supplied user_id, role, or score.
6. Use the authenticated user ID from the verified JWT.
7. Keep components and services reasonably small and reusable.
8. Avoid unnecessary abstractions.
9. Every feature must handle loading, error, and empty states.
10. All UI text must use i18n keys with both English and Vietnamese translations. Colors must use theme tokens so light and dark both work.
11. Do not install dependencies without justification.
12. Do not modify unrelated files.
13. Database changes must use migrations.
14. Keep seed data versioned.
15. Keep API contracts documented (Swagger + `docs/api.md`) and Frontend types in sync with Backend DTOs.
16. Run tests after implementation.
17. Never claim a feature is complete without verification.
18. Explain what changed, why, how to test it, and known limitations.

---

# Development Phases

## Phase 0 — Foundation

Frontend:

* Vite + React + TypeScript + Ant Design + SCSS
* React Router, base layouts (Main, Auth, Admin)
* TanStack Query
* `lib/api.ts` HTTP client with JWT injection and 401 → refresh handling (refresh wired in Phase 1)
* Global error boundary
* Environment configuration
* i18n (English / Vietnamese) and Light / Dark / System theme

Backend:

* NestJS project, strict TS
* Config module with env validation
* Global validation pipe, exception filter, error response shape
* Swagger at `/api/docs`
* `GET /api/v1/health`
* Supabase client factory (user-scoped + service)
* CORS

Database:

* Supabase CLI initialized in `backend/supabase`
* Local Supabase running (Docker)

Docs:

* README with setup/run instructions for both projects
* `docs/architecture.md`

Do not build learning features yet.

Stop and report when Phase 0 is complete.

---

## Phase 1 — Authentication & Profile

Implement:

* Backend `/auth/*` endpoints: register, verify email, resend verification, login, refresh, logout, forgot password, reset password, change password
* Supabase email templates + redirect URL configuration
* Frontend pages: Register, Login, Verify Email, Forgot Password, Reset Password
* Token storage + automatic refresh in `lib/api.ts`
* `profiles` table, trigger, enums, RLS
* `JwtAuthGuard`, `@CurrentUser()`, `RolesGuard`, `is_admin()`
* `GET/PATCH /me`
* Frontend auth guards (protected routes, admin routes)
* Profile page
* Phone OTP only if an SMS provider has been chosen (otherwise skip, document as V2)

Add tests:

* API: each auth endpoint (happy path, validation errors, wrong password, unverified email, invalid/expired token hash)
* API: generic login error + forgot-password always `200` (no user enumeration)
* API: rate limit returns `429`
* API: expired/tampered access token → `401`, refresh works, logout revokes refresh token
* RLS: profile access
* E2E: register → verify → login → logout

Stop and report.

---

## Phase 2 — Learning (Learner side)

Implement:

* Tables: skills, courses, modules, lessons, lesson_progress (+ RLS, indexes)
* Minimal seed: skills + 1 sample course
* Learner endpoints for courses, lessons, progress, continue
* Course list by skill, course detail, lesson viewer (Markdown)
* Progress tracking and resume learning

Add tests.

Stop and report.

---

## Phase 3 — Practice

Implement:

* Tables: exercises, exercise_answers, exercise_attempts (+ RLS)
* Grading service per exercise type (unit-tested)
* Exercise endpoints + attempt submission + attempt history
* Practice UI for all 5 types
* Result screen with score, feedback, explanation

Add tests (grading unit tests are mandatory).

Stop and report.

---

## Phase 4 — Admin CMS

Implement:

* All `/admin/*` endpoints
* Admin layout and navigation (visible only to admins)
* Course list + filters
* Course editor with module/lesson/exercise tree
* Markdown lesson editor with preview
* Type-specific exercise editor including answer key
* Publish / archive / delete rules
* Drag-and-drop reordering
* Preview as learner

Add tests:

* Learner gets 403 on every admin endpoint
* Draft content is invisible to learners (API + RLS)
* Delete is blocked when progress/attempts exist
* Slug uniqueness → 409

Stop and report.

---

## Phase 5 — Dashboard

Implement:

* Views for skill progress and activity
* `GET /dashboard`
* Overall progress, skill progress, learning streak, recent activity, continue learning, weak areas

Stop and report.

---

## Phase 6 — Curriculum

Seed an initial curriculum:

* 7 skills
* ~20 modules
* ~40 lessons
* ~100 exercises

Content is authored as versioned JSON/Markdown in `backend/seed/` and imported by a script (idempotent upsert by slug). After import, content remains editable through the Admin CMS.

Do not hardcode curriculum into React components.

---

## Phase 7 — QA

Test the application as a QA project.

Create:

* Test Plan
* Test Scenarios
* Test Cases
* Regression Checklist
* API tests
* Security/RLS tests
* Playwright E2E tests

Important E2E flows:

1. Register
2. Login
3. Open lesson
4. Complete lesson
5. Submit quiz
6. Verify progress
7. Logout
8. Login again
9. Verify progress persisted
10. Admin creates a course → publishes it → learner sees it

Security scenarios:

* User A cannot read User B progress (API + direct DB via RLS)
* User A cannot update User B progress
* Learner cannot call admin endpoints (403)
* Learner cannot change own role via `PATCH /me`
* Learner cannot read exercise answer keys (API + RLS)
* Client-supplied score/user_id is ignored
* Unauthenticated user cannot access protected pages or endpoints (401)
* Invalid exercise ID / lesson ID (400 vs 404)
* Expired / tampered JWT
* Refresh token cannot be reused after logout
* Brute-force login is rate limited
* Auth responses do not reveal whether an email is registered

---

## Phase 8 — Polish

Improve:

* Responsive UI
* Accessibility
* Loading states
* Empty states
* Error states
* Performance
* UX
* Navigation
* Visual consistency

Do not introduce unnecessary features.

---

# Definition of Done

A feature is NOT complete just because the code compiles.

A feature is complete only when:

* UI implemented
* API endpoint implemented and documented in Swagger
* Database implemented
* Migration created
* RLS verified
* Backend authorization verified (guards/roles)
* Validation implemented (DTO + DB constraints)
* Loading state implemented
* Error state implemented
* Empty state implemented where relevant
* UI text translated (en + vi) and checked in light and dark themes
* Tests implemented
* Tests pass
* Manual verification completed
* Documentation updated

---

# Future V2

Do NOT implement V2 now.

Possible future features:

* Phone OTP (if not done in V1)
* Bug report file attachments (Supabase Storage)
* AI QA Coach
* AI Test Case Review
* AI Bug Report Review
* AI Scenario Evaluation
* Personalized learning recommendations
* Advanced analytics
* Gamification
* Achievement system
* Content version history in the Admin CMS

The V1 architecture should leave room for these features without implementing them now.

---

# Important Development Behavior

Work phase by phase.

Do not implement the entire project in one operation.

After each phase:

1. Inspect the implementation.
2. Run relevant tests.
3. Fix discovered issues.
4. Summarize changed files.
5. Explain how to verify the phase.
6. Report known limitations.
7. STOP and wait for approval before starting the next phase.

Prioritize correctness, maintainability, security, and testability over speed.
