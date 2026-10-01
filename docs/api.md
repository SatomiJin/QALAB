# API

Base path `/api/v1`. JSON only. Swagger UI at `/api/docs` is the full, generated contract; this file records the rules and the endpoints built so far.

## Conventions

* Every route needs `Authorization: Bearer <accessToken>`, except `GET /health` and the public `/auth/*` routes.
* Errors always have this shape:

  ```json
  { "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": [{ "field": "email", "message": "email must be an email" }] }
  ```

* `400` validation (unknown body fields are rejected too), `401` missing/invalid/expired token, `403` wrong role, `404` not found, `409` conflict, `429` rate limited, `503` Supabase unreachable.
* The user is always taken from the verified token. `user_id`, `role` and scores sent by the client are never used.
* Backend messages are English. The frontend translates network, rate-limit and generic errors, and the messages listed below.

## Session

`POST /auth/login`, `/auth/verify-email` and `/auth/refresh` return:

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<opaque>",
  "expiresAt": 1790000000,
  "user": { "id": "uuid", "email": "learner@example.com", "emailVerified": true }
}
```

* `expiresAt` is Unix epoch seconds. Access tokens live 1 hour.
* Refresh tokens rotate: each works once; `/auth/refresh` returns a new one.

## Auth endpoints

All `/auth/*` endpoints are rate limited per IP and per endpoint: `AUTH_RATE_LIMIT` requests per minute (default 5), then `429` with `Retry-After`.

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, displayName }` | `201 { message }` | `400` validation |
| POST | `/auth/verify-email` | public | `{ tokenHash, type: "email" \| "signup" }` | `200` session | `400 Verification link is invalid or has expired` |
| POST | `/auth/resend-verification` | public | `{ email }` | `200 { message }`, always | `400` invalid email |
| POST | `/auth/login` | public | `{ email, password }` | `200` session | `401 Invalid email or password`; `403 Email not verified` |
| POST | `/auth/refresh` | public | `{ refreshToken }` | `200` session | `401 Invalid or expired refresh token` |
| POST | `/auth/logout` | JWT | — | `204` | `401` |
| POST | `/auth/forgot-password` | public | `{ email }` | `200 { message }`, always | `400` invalid email |
| POST | `/auth/reset-password` | public | `{ tokenHash, newPassword }` | `200 { message }` | `400 Reset link is invalid or has expired`; `400` with `details[newPassword]` (same as old, policy) |
| POST | `/auth/change-password` | JWT | `{ currentPassword, newPassword }` | `200 { message }` | `400` with `details[currentPassword]` (wrong) or `details[newPassword]` |

Rules:

* Password policy: 8–72 characters (72 is the bcrypt limit). Login does not apply the policy, so a short password gets the same `401` as a wrong one.
* Emails are trimmed and lower-cased.
* No user enumeration: register, resend and forgot-password answer the same for known and unknown emails. Login returns one generic `401`. `403 Email not verified` is only reachable with the correct password.
* Register sends the email with `emailRedirectTo = FRONTEND_URL/auth/verify`; forgot-password with `FRONTEND_URL/auth/reset-password`.
* Logout revokes the current session only (other devices stay signed in). The access token itself stays valid until it expires (≤ 1 h), because it is verified locally.
* Reset password signs out every session of the user. Change password keeps the current session.
* A wrong current password is `400`, not `401`: `401` means "your session is invalid" and makes the frontend sign you out.

## Profile

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/me` | — | `200` profile | `401`; `404` profile row missing |
| PATCH | `/me` | `{ displayName?, experienceLevel?, learningGoals? }` | `200` profile | `400` validation or protected field (`role`, `id`, `email`, …) |

```json
{
  "id": "uuid",
  "email": "learner@example.com",
  "displayName": "Minh",
  "experienceLevel": "some_qa",
  "learningGoals": ["Write better bug reports"],
  "role": "learner",
  "createdAt": "2026-09-29T05:00:00.000Z",
  "updatedAt": "2026-09-29T05:00:00.000Z"
}
```

* `displayName`: 1–80 characters after trimming.
* `experienceLevel`: `beginner` | `some_qa` | `working_qa` | `automation_qa` | `null` (clears it).
* `learningGoals`: up to 10 strings of up to 200 characters; blanks are dropped.
* An empty body returns the current profile.
* `role` cannot be changed by any API. Change it in the database (SQL editor): `update profiles set role = 'admin' where id = '…';`

## Learning

All routes need a JWT. Learners (and admins, on these routes) see only **published** content whose module and course are published too; anything else is `404`, whatever the reason.

| Method | Path | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/skills` | — | `200 Skill[]` in order | `401` |
| GET | `/courses` | `?skill=&page=&pageSize=&lang=` (all optional) | `200 CoursePage` in catalogue order (skill order, then course order) | `400` invalid skill code, page, pageSize, lang or unknown query parameter |
| GET | `/courses/:slug` | `?lang=` | `200 CourseDetail` | `404 Course not found` |
| GET | `/lessons/:id` | `?lang=` | `200 Lesson` | `400` id is not a UUID; `404 Lesson not found` |
| POST | `/lessons/:id/progress` | `{ progressPercent?, complete? }` | `200 LessonProgress` | `400` validation / unknown field; `404` |
| GET | `/continue` | `?lang=` | `200 { item: ContinueItem \| null }` | `401` |

```json
// CoursePage
{ "items": [CourseSummary], "total": 46, "page": 1, "pageSize": 20, "language": "vi", "translation": "machine" }

// CourseSummary (CourseDetail adds modules[], nextLessonId, language, translation)
{
  "id": "uuid", "slug": "qa-fundamentals-first-steps", "title": "QA fundamentals: first steps",
  "description": "…", "skill": { "code": "fundamentals", "name": "QA Fundamentals" },
  "orderIndex": 1, "estimatedMinutes": 31,
  "progress": { "totalLessons": 4, "completedLessons": 1, "status": "in_progress" }
}

// Lesson
{
  "id": "uuid", "slug": "why-we-test", "title": "Why we test", "contentMd": "## …", "estimatedMinutes": 6,
  "course": { "id": "uuid", "slug": "…", "title": "…" }, "module": { "id": "uuid", "title": "…" },
  "previousLesson": null, "nextLesson": { "id": "uuid", "title": "…" },
  "progress": { "status": "in_progress", "progressPercent": 40, "startedAt": "…", "completedAt": null, "lastAccessedAt": "…" }
}

// ContinueItem
{
  "reason": "resume", "lessonId": "uuid", "lessonTitle": "…", "estimatedMinutes": 7,
  "course": { "id": "uuid", "slug": "…", "title": "…" }, "module": { "id": "uuid", "title": "…" },
  "progress": { … }
}
```

Rules:

* `status` (lesson and course): `not_started` | `in_progress` | `completed`. A course is `in_progress` once any lesson is opened, `completed` when all its lessons are. A lesson without a row is `not_started`, 0 %.
* `CourseDetail.modules[].lessons[]` and `previousLesson`/`nextLesson` skip unpublished lessons and cross module boundaries. `nextLessonId` is the first lesson not completed (null when all are).
* **Progress** (`POST /lessons/:id/progress`): an empty body records a visit (`in_progress`, sets `startedAt` once, updates `lastAccessedAt`). `progressPercent` is a whole number 0–100; a lower value than the saved one is ignored. `complete: true` sets `completed`, 100 % and `completedAt`; `complete: false` does nothing. A completed lesson stays completed. The database enforces the same rules (trigger), so concurrent requests cannot undo each other. `status`, `userId` and other fields are rejected (`400`).
* **Continue** picks, in order: the most recently opened lesson if unfinished (`resume`); else the next unfinished lesson of that course; else another unfinished lesson; else the first unfinished lesson in catalogue order (`start` when there is no progress at all). A suggested lesson that was already opened is `resume`, otherwise `next`. `item` is `null` when every published lesson is completed.
* **Pagination** (`/courses`): `page` ≥ 1 (default 1), `pageSize` one of `20`, `50`, `100` (default 20). `total` counts every course matching the filter. A page past the end returns `items: []` with the real `total`. An unknown skill code returns an empty page.
* **Language** (`?lang=en|vi`, default `en`) on `/courses`, `/courses/:slug`, `/lessons/:id`, `/continue`. Every one of these responses carries `language` (asked for) and `translation`:
  * `none` — English.
  * `manual` — every text has a translation written by a person (seeded now, Admin CMS later). Preferred over machine translation; needs no provider.
  * `machine` — at least one text is machine-translated; course/module/lesson titles, descriptions and the lesson Markdown are machine-translated (Google Cloud Translation). QA terms (Test case, Bug report, Severity, Priority, Pass/Fail…), inline code, code blocks and URLs stay in English; Markdown structure is kept.
  * `unavailable` — some or all text is English because no provider is configured (`GOOGLE_TRANSLATE_API_KEY` unset) or it failed. The request still succeeds.
* Per text: a manual translation of the current English source, else a cached machine translation of it, else a new machine translation (if configured), else English. Translations are tied to the source text by hash: editing the English makes them stale. Machine ones are cached, so each version of a text is translated (and billed) once. Skill names are translated in the frontend by `code`.

## Practice

All routes need a JWT. An exercise is visible when it **and** its lesson, module and course are published; anything else is `404 Exercise not found`. Answer keys are never returned by any route; the explanation, model answer and rubric (the *review*) come only with your own attempt.

| Method | Path | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/exercises` | `?type=&skill=&difficulty=&lessonId=&page=&pageSize=&lang=` (all optional) | `200 ExercisePage` in catalogue order (skill, course, module, lesson, exercise order) | `400` unknown type/difficulty, invalid skill code, lessonId not a UUID, pageSize, unknown query parameter |
| GET | `/exercises/:id` | `?lang=` | `200 Exercise` (no answer key) | `400` not a UUID; `404` |
| POST | `/exercises/:id/attempts` | `{ answer }`, `?lang=` | `201 AttemptResult` | `400` invalid answer (`details`, e.g. `answer.selected`) or unknown field (`score`, `userId`…); `404`; `429` more than `ATTEMPT_RATE_LIMIT` (default 20) per minute **per user** |
| GET | `/exercises/:id/attempts` | `?page=&pageSize=&lang=` | `200 AttemptPage`, your attempts newest first | `400`; `404` |
| POST | `/exercises/:id/attempts/:attemptId/self-assessment` | `{ checked: string[] }` | `200 Attempt` | `400` choice type, or unknown / repeated rubric id; `404` not your attempt at this exercise; `409` already saved |

```json
// ExercisePage: { items: [ExerciseSummary], total, page, pageSize, language, translation }
// ExerciseSummary (Exercise adds prompt, language, translation)
{
  "id": "uuid", "type": "bug_report", "difficulty": "medium", "question": "Markdown…",
  "lesson": { "id": "uuid", "title": "…" }, "course": { "id": "uuid", "slug": "…", "title": "…" },
  "skill": { "code": "fundamentals", "name": "QA Fundamentals" },
  "stats": { "attemptCount": 2, "bestScore": 80, "lastScore": 60, "lastAttemptedAt": "…", "passed": true }
}
// Exercise.prompt — multiple_choice: { options: [{ id, text }], multiple }; classification: { categories, items }; free-text types: {}

// AttemptResult
{
  "attempt": {
    "id": "uuid", "exerciseId": "uuid", "score": 65, "isCorrect": false, "answer": { … as graded },
    "feedback": { "type": "bug_report", "parts": [{ "part": "fields", "score": 100, "weight": 30 }, …],
                  "fields": [{ "field": "title", "present": true }],
                  "severity": { "expected": "major", "given": "major", "match": true },
                  "priority": { "expected": "high", "given": "low", "match": false },
                  "concepts": [{ "concept": "Discount code", "matched": true }] },
    "selfAssessment": null, "attemptedAt": "…"
  },
  "review": { "explanation": "Markdown", "modelAnswer": "Markdown or null", "rubric": [{ "id": "repro", "text": "…" }] },
  "language": "en", "translation": "none"
}
// AttemptPage: { items: [Attempt], total, page, pageSize, review: Review | null (null before the first attempt), language, translation }
```

Answers per type (`answer`):

| Type | Answer | Grading (`backend/src/practice/grading.ts`) |
|---|---|---|
| `multiple_choice` | `{ selected: string[] }` — exactly one unless `prompt.multiple` | exact set → 100, else 0; correct = 100 |
| `classification` | `{ mapping: { [itemId]: categoryId } }` — every item | % of items right; correct = all right |
| `test_case` | `{ testCaseId, title, preconditions, testData, steps[], expectedResult, priority, testType }` | required fields present 40 % + concepts 60 % |
| `bug_report` | `{ bugId, title, environment, preconditions, stepsToReproduce[], actualResult, expectedResult, severity, priority, attachment }` | required fields 30 % + severity 20 % + priority 20 % + concepts 30 % |
| `scenario` | `{ text }` (1–5000) | concepts 100 % |

Rules:

* `?type=` takes one type or several, comma-separated (`multiple_choice,classification` for the Quiz tab). `?lessonId=` lists one lesson's exercises; a lesson you cannot see gives an empty page. Pagination as for `/courses`.
* Structured answers may be incomplete (missing fields lower the score) but not empty (`answer.title`: "Fill in at least one field"). Text is trimmed, empty steps dropped; `attempt.answer` is the normalised answer. Limits: IDs ≤ 50, titles ≤ 200, texts ≤ 2000, ≤ 30 steps of ≤ 500, attachment ≤ 500. `priority` `high|medium|low`, `severity` `critical|major|minor|trivial`, `testType` `functional|negative|boundary|regression|smoke|usability|performance|security`, each nullable.
* Concepts: a concept counts when any of its keywords appears at the start of a word, case- and accent-insensitive (`boundar` finds "boundaries"). Approximate by design: free-text results always show the model answer and a self-assessment checklist. Free-text types pass at **70**. A part with nothing to check is left out and the others reweighted.
* The score, verdict and feedback are computed on the server from the answer key; the client cannot send or change them. The self-assessment (free-text types) is saved once per attempt.
* `?lang=vi` translates the question, options, items and categories, and (after an attempt) the explanation, model answer and rubric. Concept names and enum values stay English (QA terms). A broken or missing answer key is a generic `500` (logged with field paths, never the key).

## Admin (Phase 4)

Every `/admin/*` route needs a JWT **and** `profiles.role = 'admin'` (`RolesGuard`): a learner gets `403` on every one, before any validation. The database checks the same rule again (RLS `is_admin()` on every write). All statuses are visible; nothing is translated (English only).

| Method | Path | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/admin/courses` | `?skill=&status=&page=&pageSize=` | `200 AdminCoursePage` in catalogue order (skill, course order) | `400` unknown status / query parameter; unknown skill → empty page |
| POST | `/admin/courses` | `{ skillId, title, slug, description? }` | `201 AdminCourse` (draft, at the end of its skill) | `400` (`skillId is not a skill`, slug format, `status` not allowed); `409` slug used |
| PATCH | `/admin/courses/reorder` | `{ skillId, ids }` | `204` | `400` not every course of the skill exactly once |
| GET | `/admin/courses/:id` | | `200 AdminCourse` with the full tree | `400`; `404` |
| PATCH | `/admin/courses/:id` | `{ skillId?, title?, slug?, description? }` (empty body = unchanged) | `200 AdminCourse`; a new skill puts it at the end of that skill | `400`; `404`; `409` slug used |
| POST | `/admin/courses/:id/publish` · `/unpublish` · `/archive` | | `200 AdminCourse` (`unpublish` = back to draft, also from archived) | `404`; `409` publish without a published lesson in a published module |
| DELETE | `/admin/courses/:id` | | `204` (modules, lessons, exercises, keys and translations go with it) | `404`; `409` in use |
| POST | `/admin/courses/:id/modules` | `{ title, description?, status? }` | `201 AdminModule` (at the end) | `400`; `404` |
| PATCH | `/admin/courses/:id/modules/reorder` | `{ ids }` | `204` | `400`; `404` |
| PATCH | `/admin/modules/:id` | `{ title?, description?, status? }` | `200 AdminModule` | `400` (`courseId` not allowed); `404` |
| DELETE | `/admin/modules/:id` | | `204` | `404`; `409` in use |
| POST | `/admin/modules/:id/lessons` | `{ title, slug, contentMd?, estimatedMinutes?, status? }` | `201 AdminLesson` | `400`; `404`; `409` slug used in this module |
| PATCH | `/admin/modules/:id/lessons/reorder` | `{ ids }` | `204` | `400`; `404` |
| GET | `/admin/lessons/:id` | | `200 AdminLesson` (draft content, exercises) | `400`; `404` |
| PATCH | `/admin/lessons/:id` | `{ title?, slug?, contentMd?, estimatedMinutes?, status? }` | `200 AdminLesson` | `400` (`moduleId` not allowed); `404`; `409` slug |
| DELETE | `/admin/lessons/:id` | | `204` | `404`; `409` in use |
| POST | `/admin/lessons/:id/exercises` | `{ type, question, promptData, answerData, explanation?, difficulty?, status? }` | `201 AdminExercise` | `400` with `details` (`promptData.options[1].text`, `answerData.correct`…); `404` |
| PATCH | `/admin/lessons/:id/exercises/reorder` | `{ ids }` | `204` | `400`; `404` |
| GET | `/admin/exercises/:id` | | `200 AdminExercise` **with the answer key** | `400`; `404` |
| PATCH | `/admin/exercises/:id` | `{ question?, promptData?, answerData?, explanation?, difficulty?, status? }` | `200 AdminExercise` | `400` (`type` not allowed; key does not fit the prompt; changed ids after attempts); `404` |
| DELETE | `/admin/exercises/:id` | | `204` | `404`; `409` attempted |

```json
// AdminCoursePage: { items: [AdminCourseSummary], total, page, pageSize }
// AdminCourseSummary
{ "id": "uuid", "slug": "…", "title": "…", "description": "…", "status": "draft", "orderIndex": 1,
  "skill": { "id": "uuid", "code": "fundamentals", "name": "QA Fundamentals" },
  "moduleCount": 2, "lessonCount": 4, "publishedLessonCount": 3, "updatedAt": "…" }
// AdminCourse: summary fields (no counts) + inUse, canPublish, createdAt, modules:
//   [{ id, title, description, status, orderIndex, inUse,
//      lessons: [{ id, slug, title, estimatedMinutes, status, orderIndex, inUse,
//                  exercises: [{ id, type, difficulty, question, promptData, status, orderIndex, inUse }] }] }]
// AdminLesson: { id, slug, title, contentMd, estimatedMinutes, status, orderIndex, inUse, visibleToLearners,
//                module: { id, title, status }, course: { id, slug, title, status }, exercises: [...], createdAt, updatedAt }
// AdminExercise: exercise summary + answerData (null if missing), explanation, visibleToLearners,
//                lesson / module / course refs, createdAt, updatedAt
```

Rules:

* **Status.** New courses are drafts; modules, lessons and exercises take `status` (default `draft`). Learners see an item only when it and every parent are published (`visibleToLearners`). A course is published only through `/publish`, which needs `canPublish` (a published lesson in a published module); otherwise `409`. Unpublishing a lesson later does not unpublish its course.
* **Delete.** `inUse` = learner progress (lessons) or attempts (exercises) here or below. Content in use answers `409 "Learners have progress or attempts here. Archive it instead."`; the database's `restrict` foreign keys give the same `409` if a learner starts in between. Hard delete cascades to children, answer keys and translations.
* **Slugs.** `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100. Course slugs are unique; lesson slugs unique within their module. A used slug is `409` with `details: [{ field: "slug" }]`.
* **Reorder.** `ids` lists every child of the parent exactly once, in the new order (first = 1); otherwise `400 details[ids]`. Written in one statement (`reorder_content`). Spec said `[ { id, orderIndex } ]`; a complete ordered list was chosen so concurrent edits cannot leave a half-applied order.
* **Content never moves** between parents, and an exercise's `type` never changes (`400` unknown field; the DB has no update grant on those columns).
* **Exercises.** `promptData` and `answerData` are checked together with the grader's parsers (`parsePrompt`, `parseAnswerKey`) and stored normalised (trimmed). A new `promptData` alone is checked against the stored key. Once learners have attempted an exercise, option / item / category ids (and `multiple`) cannot change (`400` on `promptData.options`…); texts can. The key is stored in `exercise_answers` (explanation included).
* **Limits** (DTO = DB = `frontend/src/types/api.ts`): titles 1–160, descriptions ≤ 2000, `contentMd` ≤ 100 000, minutes 1–600, question 1–2000, explanation ≤ 10 000. The JSON body limit is 1 MB.
* Audit columns (`created_by`, `updated_by`) come from the token, set by a DB trigger; the client cannot send them.
* Editing English text makes its Vietnamese translations stale (they fall back to English until retranslated); editing translations in the CMS is not built yet.

## Dashboard and progress (Phase 5)

All routes need a JWT. Every value is derived on read from your lesson progress and attempts (views `v_user_skill_progress`, `v_user_exercise_results`, `v_user_activity`); nothing is stored. Only published content counts (the item and every parent), and only your own data.

| Method | Path | Query | Success | Errors |
|---|---|---|---|---|
| GET | `/dashboard` | `?lang=&tz=` (both optional) | `200 Dashboard` | `400` invalid `lang`, `tz` not an IANA time zone (≤ 64), unknown query parameter |
| GET | `/progress` | `?skill=&page=&pageSize=&lang=` | `200 ProgressPage`, courses in catalogue order | `400` as `/courses`; unknown skill → empty page |

```json
// Dashboard
{
  "overall": { "totalLessons": 12, "completedLessons": 4, "percent": 33,
               "exercises": { "total": 18, "attempted": 5, "passed": 3, "averageScore": 74 } },
  "streak": { "current": 3, "longest": 5, "activeToday": true,
              "days": [{ "date": "2026-09-17", "active": false }, … 14 days, oldest first, ending today] },
  "continue": ContinueItem | null,
  "skills": [{ "code": "fundamentals", "name": "QA Fundamentals", "totalLessons": 4, "completedLessons": 1,
               "percent": 25, "status": "in_progress", "exercises": { … as overall } }],
  "weakAreas": {
    "skills": [{ "code": "test_design", "name": "…", "averageScore": 55, "attemptedExercises": 3, "passedExercises": 1,
                 "retry": { "id": "uuid", "type": "scenario", "bestScore": 40 } | null }],
    "concepts": [{ "concept": "Boundary values", "missed": 2, "checked": 3 }]
  },
  "recentActivity": [{ "kind": "exercise_attempted", "occurredAt": "…", "lesson": { "id", "title" },
                       "course": { "id", "slug", "title" }, "exercise": { "id", "type" } | null,
                       "score": 40 | null, "isCorrect": false | null }],
  "timeZone": "Asia/Ho_Chi_Minh", "language": "en", "translation": "none"
}
// ProgressPage: { items: [CourseResult], total, page, pageSize, language, translation }
// CourseResult: CourseSummary + exercises (totals as above) + modules:
//   [{ id, title, lessons: [{ id, title, estimatedMinutes, progress: LessonProgress,
//                             exercises: [{ id, type, difficulty, question, stats: ExerciseStats }] }] }]
```

Rules:

* **The best attempt counts.** Per exercise: best score (then the latest attempt on a tie), passed = any attempt passed. `averageScore` is the rounded mean of the best scores of the attempted exercises; `null` without attempts.
* **Overall progress** is lessons: `percent` = completed / published lessons. Skills are always all 7, in order; a skill's `status` follows the course rule (completed when every lesson is, in progress once one is opened).
* **Streak.** A day counts when you started, completed or opened a lesson (the last visit of each lesson is kept) or answered an exercise, in the time zone `tz` (default UTC; the frontend sends the browser's). `current` counts back from today, or from yesterday when nothing is done yet today: a streak breaks only after a whole day without study. Study on content that is unpublished since still counts.
* **Weak areas.** Skills with at least one answer whose average best score is below 70 (the pass mark), lowest first, at most 3; `retry` is the not-passed exercise with the lowest best score. Concepts: the free-text concept checks missed in the best answers, grouped by name (case-insensitive), most often missed first (share, then count), at most 5.
* **Recent activity**: the latest 10 of lesson started / completed and exercise answered, newest first, on content that is still published.
* **Continue** is the same choice as `GET /continue`. Titles follow `?lang=` like the learning routes.

## Health

`GET /health` (public) → `200 { status: "ok", timestamp, uptimeSeconds }`.
