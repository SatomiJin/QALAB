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

* Content is authored in English. `?lang=vi` serves, per text: a **manual** translation (written by a person; seed now, Admin CMS later) → a cached machine translation → a new machine translation (only if a provider key is configured; it costs money) → English. QA terms, code, code blocks and URLs stay English; Markdown structure is kept.
* Manual translations are the default way to add Vietnamese (free, controlled wording). When writing curriculum (Phase 6) or seed content, write the `vi` rows too. Status `manual` only when every text on the response is human-translated.
* Translation never fails a request: no key, provider error or unreadable cache → English with `translation: "unavailable"`. Every content response states `language` and `translation`.
* Every translation stores the sha-256 of its English source; an edited source makes it stale (machine ones are redone, manual ones wait for a person). Machine rows also store the pipeline version.
* Only the service role writes translations (seed, backend, later the Admin CMS through the backend). A learner-written translation would be shown to every learner.
* A translation must not reveal content that is no longer published (read policy checks the content's visibility).

## Lists

* Lists that can grow are paginated with `page` (≥ 1) and `pageSize` ∈ {20, 50, 100}, default 20; responses carry `items`, `total`, `page`, `pageSize`. Past the end → empty `items` with the real `total` (the UI moves to the last page).
* Sort the lightweight rows first, then load details only for the page.

## Grading (Phase 3+)

* Submissions are stored with the user id from the token; the score, verdict and feedback are computed server-side with `service()` reading the answer key, then only the result is returned.
* Re-grading or changing an attempt's score from the client is never possible.

## Content (Phase 4+)

* Lifecycle `draft → published → archived`. Learners see only `published` content whose parents are also `published` (RLS + query filter).
* Content with learner progress or attempts is archived, never hard-deleted. Hard delete only when unused, with UI confirmation.
* Content tables store `created_by`, `updated_by` (from the token), `created_at`, `updated_at`.
* Slugs: lowercase `a-z0-9-`, unique within their scope. Answer keys are validated against the exercise type on the backend.
* Grading is deterministic (no AI in V1). Free-text answers also show the model answer + self-assessment checklist; both results are stored in `exercise_attempts`.

## Keep in sync

When any of these rules changes, update this file, `docs/api.md`, and the tests that prove the rule.
