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

## Health

`GET /health` (public) → `200 { status: "ok", timestamp, uptimeSeconds }`.
