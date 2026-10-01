# Logic rules (backend + frontend)

Business and security rules that both sides must follow. They come from `plant.md` and decisions made while building; add to this file when a new rule is decided.

## Trust boundary

* The backend is the only authority. `user_id` comes from the verified JWT; `role` from `profiles`; scores are computed on the backend. Anything the client sends for these is rejected (`400`) or ignored.
* Frontend guards, hidden buttons and client validation are UX only. Every rule is enforced again by the API and by RLS.
* Answer keys never leave the backend, in any response, error message or log.

## Authentication

* No user enumeration: register, resend-verification and forgot-password give the same answer for known and unknown emails; login has one generic `401`. `403 Email not verified` only after a correct password.
* Status codes carry meaning to the frontend: `401` = session invalid (client refreshes once, then signs out). A wrong *current password* is therefore `400` with `details`, never `401`.
* Refresh tokens rotate and are single use. On the frontend, all refreshes share one in-flight call; never send the same refresh token twice.
* Logout revokes the current session only. Reset password revokes all sessions; change password keeps the current one.
* Password policy 8–72 characters, applied on register/reset/change, not on login.
* Emails are trimmed and lower-cased on both sides.

## Validation

* Same limits in three places: DTO (class-validator), DB `check`, frontend constants in `types/api.ts`. Changing a limit means changing all three and the docs.
* Unknown body fields → `400`. Empty PATCH body → return the current resource unchanged.

## Learning and progress (Phase 2)

* Visible to learners = the item **and every parent** is `published`. Anything else answers `404`.
* Lesson status: `not_started` (no row) → `in_progress` (opened) → `completed` (explicit *Mark as complete*; reading to 100 % does not complete). Course status is derived: `completed` when every lesson is, `in_progress` once any lesson is opened. Nothing derived is stored.
* Progress is forward-only, in the service **and** a DB trigger: the percentage never drops, completed stays completed (first `completedAt` kept), `startedAt` is set once. So out-of-order or concurrent requests are harmless.
* The frontend reports: `{}` on open (records the visit, updates `lastAccessedAt`), `{ progressPercent }` in 10-point steps while scrolling, `{ complete: true }` on the button. Completed lessons send only the visit.
* Continue: most recent unfinished lesson → next unfinished lesson of the course → another unfinished lesson → first unfinished in catalogue order (skill order, course order). A suggested lesson that was already opened is `resume`; `null` when all is done. Progress on lessons that are no longer published is ignored.
* Content that has learner progress cannot be hard-deleted (FK `restrict`); archive it.

## Content language (Phase 2)

* Content is authored in English. `?lang=vi` serves, per text: a **manual** translation (written by a person; curriculum files now, Admin CMS later) → a cached machine translation → a new machine translation (only if a provider key is configured; it costs money) → English. QA terms, code, code blocks and URLs stay English; Markdown structure is kept.
* Manual translations are the default way to add Vietnamese (free, controlled wording). Curriculum files (`backend/seed/curriculum/`) are bilingual: every text has its `vi` version. Status `manual` only when every text on the response is human-translated.
* Translation never fails a request: no key, provider error or unreadable cache → English with `translation: "unavailable"`. Every content response states `language` and `translation`.
* Every translation stores the sha-256 of its English source; an edited source makes it stale (machine ones are redone, manual ones wait for a person). Machine rows also store the pipeline version.
* Only the service role writes translations (curriculum importer, backend, later the Admin CMS through the backend). A learner-written translation would be shown to every learner.
* A translation must not reveal content that is no longer published (read policy checks the content's visibility).

## Lists

* Lists that can grow are paginated with `page` (≥ 1) and `pageSize` ∈ {20, 50, 100}, default 20; responses carry `items`, `total`, `page`, `pageSize`. Past the end → empty `items` with the real `total` (the UI moves to the last page).
* Sort the lightweight rows first, then load details only for the page.

## Grading (Phase 3)

* Submissions are stored with the user id from the token; the score, verdict and feedback are computed server-side with `service()` reading the answer key, then only the result is returned.
* Graded attempts are **inserted by the backend with the service role**; learners have no insert, delete or score-update privilege on `exercise_attempts` (plant.md said "insert own"; changed so a JWT + anon key cannot write a score through PostgREST). Attempts are immutable (trigger): only the self-assessment may be added, once.
* Re-grading or changing an attempt's score from the client is never possible. A body with `score`, `isCorrect`, `userId`… is `400`.
* Answer keys, the explanation, the model answer and the rubric are the **review**: returned only with the user's own attempt (submit response, attempt history). The explanation is stored with the answer key (`exercise_answers.explanation`), not on `exercises`, because it gives the answer away. Their translations are readable only after an attempt (RLS).
* Grading is deterministic and per type (`backend/src/practice/grading.ts`): multiple choice exact set (100 / 0); classification % right, correct = all right; test case fields 40 % + concepts 60 %; bug report fields 30 % + severity 20 % + priority 20 % + concepts 30 %; scenario concepts 100 %. Free-text types pass at **70** (`PASS_SCORE`, mirrored in `frontend/src/types/api.ts`). A part with nothing to check is dropped and the rest reweighted.
* Keyword matching: case- and accent-insensitive, at the start of a word. It is approximate, so free-text results always show the model answer and a self-assessment checklist; the self-assessment is saved once per attempt (`409` on a second save).
* Structured answers may be incomplete (lower score) but not empty. Answers are validated against the exercise type and its prompt ids (`parseAnswer`); answer keys against type + prompt (`parseAnswerKey`, to be reused by the Admin CMS). A broken or missing key is a generic `500`; logs name field paths, never key values.
* Attempt submission is rate-limited per user (`ATTEMPT_RATE_LIMIT`/minute, default 20).

## Content and the Admin CMS (Phase 4)

* Lifecycle `draft → published → archived`. Learners see only `published` content whose parents are also `published` (RLS + query filter). Admin endpoints show every status and say `visibleToLearners`.
* Every `/admin/*` route: `RolesGuard` (`403` for learners, before validation) **and** RLS `is_admin()` on every write (the backend writes as the admin, never with `service()`).
* A course is published only through `POST /admin/courses/:id/publish`, and only when it has a published lesson in a published module (`409` otherwise; decided as a hard block). Modules, lessons and exercises take `status` in their PATCH. Unpublishing children later does not unpublish the course.
* `inUse` = learner progress (lesson) or attempts (exercise) at or below the item. In use → archive only; hard delete answers `409`, and the `restrict` foreign keys give the same `409` if a learner starts in between. Hard delete (with UI confirmation) cascades to children, answer keys and translations.
* Content never moves to another parent, and an exercise's type never changes (no DTO field, no column grant). To move or retype, create new content and archive the old one.
* Once an exercise has attempts, its option / item / category ids and `multiple` are fixed (stored answers and feedback refer to them); texts may change.
* Prompt data and answer key are validated together with the grader's parsers (`parsePrompt`, `parseAnswerKey`) and stored normalised. A PATCH with only `promptData` is checked against the stored key.
* Reorder requests list every child of the parent exactly once (the full new order), applied in one statement. New items go to the end (`max(order_index) + 1`).
* Content tables store `created_by`, `updated_by` (set by a DB trigger from `auth.uid()`, never from the client), `created_at`, `updated_at`.
* Slugs: lowercase `a-z0-9-`, course slugs unique, lesson slugs unique within their module; a used slug is `409` with `details[slug]`.
* Editing English text makes manual Vietnamese translations stale (English is shown until someone retranslates); translation editing in the CMS is not built yet.
* Grading is deterministic (no AI in V1). Free-text answers also show the model answer + self-assessment checklist; both results are stored in `exercise_attempts` (see Grading).
* Visible exercise = the exercise **and** its lesson, module and course are `published`; anything else is `404`.

## Dashboard and progress (Phase 5)

* Every dashboard value is derived on read (views over `lesson_progress` and `exercise_attempts`); nothing derived is stored. Only published content (item and every parent) counts, and only the caller's own rows (views are security invoker; the backend still filters on the user id because an admin's RLS shows everyone).
* **The best attempt counts** for scores, averages and weak concepts: highest score, then the latest; passed = any attempt passed. Average score = rounded mean of the best scores of the attempted exercises, `null` without attempts. Overall progress % is lessons only.
* **Streak** days: lesson started / completed / last visited or an exercise answered, counted in the learner's time zone (`?tz=`, IANA, ≤ 64, default UTC; the frontend sends the browser's). The streak is still current when nothing is done yet today but yesterday was; it breaks after a whole day without study. Study on content unpublished since still counts. `lesson_progress` keeps only the last visit, so a day on which a learner only re-read a lesson they visited again later is lost (accepted: no event table).
* **Weak areas**: skills with answers whose average best score is below `PASS_SCORE` (70), lowest first, at most 3, each with the not-passed exercise with the lowest best score to retry; concepts missed in the best free-text answers, grouped case-insensitively, most often missed first, at most 5. A skill without answers is not weak.
* Recent activity: the latest 10 events on content that is still published (titles of unpublished content are never shown).

## Curriculum (Phase 6)

* The curriculum is versioned content in `backend/seed/curriculum/` (JSON + Markdown, English and Vietnamese side by side), never in React components or SQL. `npm run seed:curriculum` imports it; after that the Admin CMS edits it like any other content.
* Identity: courses by slug; modules, lessons and exercises by a UUID v5 of their keys (`module:<course>/<key>`, `lesson:<course>/<slug>`, `exercise:<course>/<lesson>/<key>`), or an explicit `id` for content that existed before (the sample course keeps its Phase 2 ids, so learner progress stays attached). Renaming a slug or key is new content.
* The import is idempotent and never deletes. By default it only inserts what is missing, so CMS edits survive; `--update` makes the files win, except for changes the CMS forbids too (another parent, another exercise type, new option / item / category ids on an attempted exercise), which are skipped with a warning.
* A file's Vietnamese is written as a `manual` translation only while the stored English (trimmed) equals the file's English; `source_hash` is of the stored text.
* Content is validated before anything is written: unknown fields, limits (same as the DB checks), the grader's prompt / answer-key parsers, a Vietnamese version for every text with the same headings and code blocks, and every model answer (en **and** vi) matching at least `PASS_SCORE` % of its own concepts. One invalid file stops the whole import.

## Keep in sync

When any of these rules changes, update this file, `docs/api.md`, and the tests that prove the rule.
