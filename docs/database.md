# Database

Supabase PostgreSQL (cloud project, linked from `backend/`). Every change is a migration in `backend/supabase/migrations`, applied with `npx supabase db push` (`--include-seed` also applies `supabase/seed.sql`, but only the first time; after the seed changes, re-run it with `npx supabase db query --linked -f supabase/seed.sql`).

## Migrations

| File | Phase | Contents |
| --- | --- | --- |
| `20260929045519_profiles.sql` | 1 | Enums `user_role`, `experience_level`; `set_updated_at()`; `profiles` + trigger from `auth.users`; `is_admin()`; RLS and grants |
| `20260930024128_learning.sql` | 2 | Enums `content_status`, `lesson_status`; `skills` (+ the 7 skills), `courses`, `modules`, `lessons`, `lesson_progress`; `is_lesson_published()`; forward-only progress trigger; RLS, grants, indexes |
| `20260930041356_content_translations.sql` | 2 | `content_translations` (machine-translation cache); `is_content_published()`; delete triggers on content; RLS |
| `20260930064552_content_translations_manual.sql` | 2 | `provider` `manual` \| `google`, `pipeline_version` (machine rows only), unique key per provider. Upgrades the table as first pushed; idempotent |
| `20260930070812_practice.sql` | 3 | Enums `exercise_type`, `difficulty`; `exercises`, `exercise_answers`, `exercise_attempts`; `is_exercise_published()`; immutable-attempt trigger; RLS and grants; `content_translations` accepts exercises (fields, review-text read rule, delete trigger) |

Seed (`supabase/seed.sql`): one published sample course, *QA fundamentals: first steps* (2 modules, 4 lessons), and 6 exercises on its lessons covering all five types (with answer keys and Vietnamese manual translations), with fixed ids. Idempotent. `backend/src/practice/seed-exercises.spec.ts` checks every seeded prompt and answer key against the grader.

## Enums

| Enum | Values |
| --- | --- |
| `user_role` | `learner`, `admin` |
| `experience_level` | `beginner`, `some_qa`, `working_qa`, `automation_qa` |
| `content_status` | `draft`, `published`, `archived` |
| `lesson_status` | `not_started`, `in_progress`, `completed` |
| `exercise_type` | `multiple_choice`, `classification`, `test_case`, `bug_report`, `scenario` |
| `difficulty` | `easy`, `medium`, `hard` |

## `profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | FK → `auth.users(id)` on delete cascade |
| `display_name` | text not null | 1–80 characters after trim (check) |
| `experience_level` | `experience_level` | nullable |
| `learning_goals` | text[] not null default `{}` | at most 10 (check) |
| `role` | `user_role` not null default `learner` | changed only in the database |
| `created_at`, `updated_at` | timestamptz | `updated_at` kept by trigger |

* Created by the `on_auth_user_created` trigger (`handle_new_user()`, `security definer`). `display_name` comes from signup metadata `display_name`, falling back to the email local part. The migration also backfills users that existed before it.

## Learning content

`skills` → `courses` → `modules` → `lessons`. All have `created_at`/`updated_at` (trigger); content tables also have `status` (`content_status`, default `draft`), `order_index` (within the parent) and `created_by`/`updated_by` (FK → `profiles`, on delete set null).

| Table | Columns and constraints |
| --- | --- |
| `skills` | `code` unique, `^[a-z][a-z0-9_]{0,39}$`; `name` 1–80; `description` ≤ 500; `order_index` |
| `courses` | `skill_id` → skills; `title` 1–160; `slug` unique, `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100; `description` ≤ 2000 |
| `modules` | `course_id` → courses (cascade); `title` 1–160; `description` ≤ 2000 |
| `lessons` | `module_id` → modules (cascade); `title` 1–160; `slug` (same format) unique within the module; `content_md` ≤ 100 000; `estimated_minutes` 1–600 |

Indexes: `(skill_id, order_index)`, `(course_id, order_index)`, `(module_id, order_index)`.

## `lesson_progress`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid | FK → `profiles` on delete cascade |
| `lesson_id` | uuid | FK → `lessons` on delete **restrict**: a lesson with progress cannot be hard-deleted (archive it) |
| `status` | `lesson_status` | default `not_started` |
| `progress_percent` | int 0–100 | |
| `started_at`, `completed_at`, `last_accessed_at` | timestamptz | check: `completed_at` set exactly when `status = 'completed'`; `started_at` set once started |

* `unique (user_id, lesson_id)`; indexes `(user_id, last_accessed_at desc)` and `(lesson_id)`.
* Trigger `lesson_progress_forward_only` (before insert/update): the percentage never drops, a completed row stays completed (with its first `completed_at`), `started_at` never changes, `user_id`/`lesson_id` never change, completed ⇒ 100 %. Concurrent writes (scroll updates racing "mark complete") therefore cannot undo each other.

## Practice

| Table | Columns and constraints |
| --- | --- |
| `exercises` | `lesson_id` → lessons (cascade); `type`; `question` 1–2000 (Markdown); `prompt_data` jsonb object ≤ 20 000 bytes (public: options / categories / items, shape checked by the backend); `difficulty` default `easy`; `status`, `order_index`, audit columns. Index `(lesson_id, order_index)` |
| `exercise_answers` | `exercise_id` PK → exercises (cascade); `answer_data` jsonb object ≤ 50 000 bytes (correct ids / mapping / required fields, expected severity and priority, expected concepts with keywords, model answer, rubric); `explanation` ≤ 10 000 |
| `exercise_attempts` | `user_id` → profiles (cascade); `exercise_id` → exercises (**restrict**); `answer` jsonb ≤ 60 000 bytes; `score` int 0–100; `is_correct`; `feedback` jsonb; `self_assessment` jsonb nullable (`{ checked: [...] }`); `attempted_at`, `updated_at`. Indexes `(user_id, attempted_at desc)`, `(exercise_id)` |

* `explanation` lives with the answer key, not on `exercises` as first planned: it usually gives the answer away, and learners can query `exercises` directly with their JWT.
* Attempts are inserted by the backend with the service role after grading. Trigger `exercise_attempts_immutable` (before update): nothing but `self_assessment` ever changes, and that only from null to a value (a second write raises `23514`), whoever writes.

## `content_translations`

Translations of content, one row per (entity, field, language, provider). `manual` rows are written by a person (the seed has the sample course in Vietnamese; the Admin CMS will edit them); `google` rows are machine translations cached by the backend. Reads prefer `manual`.

| Column | Type | Notes |
| --- | --- | --- |
| `entity_type` | text | `course` | `module` | `lesson` | `exercise` |
| `entity_id` | uuid | polymorphic, no FK; rows are removed by `after delete` triggers on `courses`, `modules`, `lessons`, `exercises` (`delete_content_translations()`) |
| `field` | text | `title` | `description` | `content_md`; exercises: `question`, `option.<id>`, `item.<id>`, `category.<id>` (public) and `explanation`, `model_answer`, `rubric.<id>` (review texts) |
| `language` | text | `vi` |
| `source_hash` | text | sha-256 (hex) of the English source text; the seed computes it in SQL (`encode(sha256(convert_to(text, 'UTF8')), 'hex')`), the backend in Node. A changed source makes the row stale |
| `text` | text | ≤ 200 000 characters |
| `provider` | text | `manual` | `google` |
| `pipeline_version` | int | required for `google` rows (check), null for `manual`; a pipeline change redoes machine rows only |

* `unique (entity_type, entity_id, field, language, provider)`: a manual and a machine translation can coexist. Index `(entity_id, language)`.
* Written only with the service role: the seed (`manual`) and the backend (`google`). No API role may insert or update (a learner-written row would be shown to everyone).

## Helpers

* `is_admin()` — `security definer`, `stable`: true when `auth.uid()` has `role = 'admin'`. Security definer lets policies on `profiles` call it without recursing into RLS. Executable by `authenticated` only.
* `is_lesson_published(lesson_id)` — `stable`, invoker: the lesson, its module and its course are all `published`. Used by the `lesson_progress` write policies. Checks statuses explicitly because admins can read drafts.
* `is_content_published(type, id)` — `stable`, invoker: a course, module, lesson or exercise and all its parents are `published`. Used by the `content_translations` read policy.
* `is_exercise_published(exercise_id)` — `stable`, invoker: the exercise is `published` and `is_lesson_published(lesson_id)`. Used by the attempt update policy.
* `set_updated_at()` — shared `before update` trigger function for every table.

## RLS and privileges

| Table | `authenticated` (learner) | Admin | `anon` |
| --- | --- | --- | --- |
| `profiles` | select own; update own `display_name`, `experience_level`, `learning_goals` | select all | none |
| `skills` | select | select | none |
| `courses` | select `published` | select all | none |
| `modules`, `lessons` | select when it and every parent are `published` | select all | none |
| `lesson_progress` | select own; insert/update own on published lessons | select all | none |
| `exercises` | select when it and its lesson chain are `published` | select all | none |
| `exercise_answers` | **none** | select all | none |
| `exercise_attempts` | select own; update own `self_assessment` only (on published exercises); **no insert, no delete** | select all | none |
| `content_translations` | select when the content is published (`is_content_published`); exercise review texts only after an own attempt at that exercise | select all | none |

* No insert/update/delete on content for any API role yet (admin writes arrive with the Admin CMS, Phase 4).
* No delete on `lesson_progress`. Column grants keep `id`, `created_at`, `updated_at` unwritable; `user_id`/`lesson_id` are in the update grant only because upserts set them, and the trigger keeps them unchanged.
* `profiles.role`, `id` and timestamps are read-only for every API role, admins included (column-level grants). An attempt returns Postgres `42501`.
* Learner API queries filter on `status = 'published'` on top of RLS, so admins see what learners see on learner endpoints.

* Answer keys are read by the backend with the service role only, to grade and to build the review of the user's own attempt.

Verified by `backend/test/integration/profiles-rls.int-spec.ts`, `learning-rls.int-spec.ts`, `translations-rls.int-spec.ts` and `practice-rls.int-spec.ts`.
