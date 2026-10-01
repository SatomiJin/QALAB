# Database

Supabase PostgreSQL (cloud project, linked from `backend/`). Every change is a migration in `backend/supabase/migrations`, applied with `npx supabase db push`. Content is not in SQL: `npm run seed:curriculum` imports the curriculum from `backend/seed/curriculum/` (see below).

## Migrations

| File | Phase | Contents |
| --- | --- | --- |
| `20260929045519_profiles.sql` | 1 | Enums `user_role`, `experience_level`; `set_updated_at()`; `profiles` + trigger from `auth.users`; `is_admin()`; RLS and grants |
| `20260930024128_learning.sql` | 2 | Enums `content_status`, `lesson_status`; `skills` (+ the 7 skills), `courses`, `modules`, `lessons`, `lesson_progress`; `is_lesson_published()`; forward-only progress trigger; RLS, grants, indexes |
| `20260930041356_content_translations.sql` | 2 | `content_translations` (machine-translation cache); `is_content_published()`; delete triggers on content; RLS |
| `20260930064552_content_translations_manual.sql` | 2 | `provider` `manual` \| `google`, `pipeline_version` (machine rows only), unique key per provider. Upgrades the table as first pushed; idempotent |
| `20260930070812_practice.sql` | 3 | Enums `exercise_type`, `difficulty`; `exercises`, `exercise_answers`, `exercise_attempts`; `is_exercise_published()`; immutable-attempt trigger; RLS and grants; `content_translations` accepts exercises (fields, review-text read rule, delete trigger) |
| `20260930090356_admin_cms.sql` | 4 | Admin writes: `set_content_audit()` trigger on content; insert/update/delete policies (`is_admin()`) and column grants on `courses`, `modules`, `lessons`, `exercises`, insert/update on `exercise_answers`; `reorder_content()`, `content_usage()` |
| `20260930144044_dashboard.sql` | 5 | Views `v_user_exercise_results`, `v_user_skill_progress`, `v_user_activity` (security invoker); `activity_days(tz)`; select for `authenticated` only |

Curriculum (`backend/seed/curriculum/`, imported by `npm run seed:curriculum`, `backend/src/curriculum/`): the V1 curriculum for all 7 skills (outline in [curriculum.md](curriculum.md)), with answer keys and Vietnamese `manual` translations. Written with the service role (audit columns stay `null`). Courses are matched by slug; modules, lessons and exercises by UUID v5 ids derived from their keys; the Phase 2–3 sample course *QA fundamentals: first steps* keeps its original fixed ids (`6f1d2a4e-…`). Idempotent, never deletes, inserts only what is missing unless `--update`. `curriculum/curriculum.spec.ts` checks every file. `supabase/seed.sql` is a stub.

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

Translations of content, one row per (entity, field, language, provider). `manual` rows are written by a person (the curriculum importer writes them; editing them in the Admin CMS is a later step); `google` rows are machine translations cached by the backend. Reads prefer `manual`.

| Column | Type | Notes |
| --- | --- | --- |
| `entity_type` | text | `course` | `module` | `lesson` | `exercise` |
| `entity_id` | uuid | polymorphic, no FK; rows are removed by `after delete` triggers on `courses`, `modules`, `lessons`, `exercises` (`delete_content_translations()`) |
| `field` | text | `title` | `description` | `content_md`; exercises: `question`, `option.<id>`, `item.<id>`, `category.<id>` (public) and `explanation`, `model_answer`, `rubric.<id>` (review texts) |
| `language` | text | `vi` |
| `source_hash` | text | sha-256 (hex) of the English source text; the curriculum importer and the backend compute it in Node (`translation/source-hash.ts`), of the stored English. A changed source makes the row stale |
| `text` | text | ≤ 200 000 characters |
| `provider` | text | `manual` | `google` |
| `pipeline_version` | int | required for `google` rows (check), null for `manual`; a pipeline change redoes machine rows only |

* `unique (entity_type, entity_id, field, language, provider)`: a manual and a machine translation can coexist. Index `(entity_id, language)`.
* Written only with the service role: the curriculum importer (`manual`) and the backend (`google`). No API role may insert or update (a learner-written row would be shown to everyone).

## Views (derived, Phase 5)

All `security_invoker = true`: the caller's RLS applies to every table they read, so a learner sees only their own rows and an admin everyone's (the backend always filters `user_id`). Content counts only when it and every parent are `published` (checked explicitly). `select` for `authenticated` only; nothing for `anon`.

| View | One row per | Columns |
| --- | --- | --- |
| `v_user_exercise_results` | user × attempted exercise | `attempt_count`, `best_score` (highest, then latest), `last_score`, `last_attempted_at`, `passed` (any attempt), `best_feedback` |
| `v_user_skill_progress` | user (visible profile) × every skill | `skill_code`, `skill_name`, `skill_order`, `total_lessons` / `completed_lessons` / `started_lessons` (published), `total_exercises` / `attempted_exercises` / `passed_exercises` (published), `average_score` (mean of best scores, rounded; null without attempts) |
| `v_user_activity` | event | `kind` (`lesson_started`, `lesson_completed`, `lesson_visited` = last visit only, `exercise_attempted`), `occurred_at`, `lesson_id`, `exercise_id`, `attempt_id`, `score`, `is_correct`, `visible` (content still published) |

## Helpers

* `is_admin()` — `security definer`, `stable`: true when `auth.uid()` has `role = 'admin'`. Security definer lets policies on `profiles` call it without recursing into RLS. Executable by `authenticated` only.
* `is_lesson_published(lesson_id)` — `stable`, invoker: the lesson, its module and its course are all `published`. Used by the `lesson_progress` write policies. Checks statuses explicitly because admins can read drafts.
* `is_content_published(type, id)` — `stable`, invoker: a course, module, lesson or exercise and all its parents are `published`. Used by the `content_translations` read policy.
* `is_exercise_published(exercise_id)` — `stable`, invoker: the exercise is `published` and `is_lesson_published(lesson_id)`. Used by the attempt update policy.
* `set_updated_at()` — shared `before update` trigger function for every table.
* `set_content_audit()` — `before insert or update` on `courses`, `modules`, `lessons`, `exercises`: `created_by` / `updated_by` = `auth.uid()` (kept as given when there is no user, e.g. the curriculum importer); `created_by` never changes on update.
* `reorder_content(kind, parent_id, ids[])` — invoker (RLS decides): sets `order_index` = position for the children of one parent (course → skill, module → course, lesson → module, exercise → lesson) in one statement; raises `22023` for duplicates, an unknown kind, or when not every id was updated (a child of another parent, or a caller who may not update — so learners get an error, not a silent no-op).
* `activity_days(time_zone)` — invoker, stable: the distinct local dates of the caller's (`auth.uid()`) activity, newest first, for the streak (one row per day, so the API row limit is not hit). An unknown zone raises `22023`. Executable by `authenticated` only.
* `content_usage(lesson_ids[], exercise_ids[])` — invoker, stable: `(kind, id)` of the given lessons with progress and exercises with attempts. Admins see everyone's rows; anyone else only their own. The backend uses it for `inUse`.

## RLS and privileges

| Table | `authenticated` (learner) | Admin | `anon` |
| --- | --- | --- | --- |
| `profiles` | select own; update own `display_name`, `experience_level`, `learning_goals` | select all | none |
| `skills` | select | select | none |
| `courses` | select `published` | select all; insert / update / delete | none |
| `modules`, `lessons` | select when it and every parent are `published` | select all; insert / update / delete | none |
| `lesson_progress` | select own; insert/update own on published lessons | select all | none |
| `exercises` | select when it and its lesson chain are `published` | select all; insert / update / delete | none |
| `exercise_answers` | **none** | select all; insert / update (removed only with the exercise) | none |
| `exercise_attempts` | select own; update own `self_assessment` only (on published exercises); **no insert, no delete** | select all | none |
| `v_user_*` views | own rows (RLS of the underlying tables) | all rows | none |
| `content_translations` | select when the content is published (`is_content_published`); exercise review texts only after an own attempt at that exercise | select all | none |

* Content writes (Phase 4): the grants are to `authenticated`, the policies allow admins only (`is_admin()`). A learner's insert is `42501`; a learner's update / delete matches no row (RLS) and changes nothing. Column grants: nobody writes `id`, `created_by`, `updated_by` or timestamps; nobody updates a module's `course_id`, a lesson's `module_id`, an exercise's `lesson_id` or `type` (content does not move, types do not change). Hard deletes of content with progress or attempts fail on the `restrict` foreign keys (`23503`); cascaded children and translations go with an allowed delete.
* No delete on `lesson_progress`. Column grants keep `id`, `created_at`, `updated_at` unwritable; `user_id`/`lesson_id` are in the update grant only because upserts set them, and the trigger keeps them unchanged.
* `profiles.role`, `id` and timestamps are read-only for every API role, admins included (column-level grants). An attempt returns Postgres `42501`.
* Learner API queries filter on `status = 'published'` on top of RLS, so admins see what learners see on learner endpoints.

* Answer keys are read by the backend with the service role only, to grade and to build the review of the user's own attempt.

Verified by `backend/test/integration/profiles-rls.int-spec.ts`, `learning-rls.int-spec.ts`, `translations-rls.int-spec.ts`, `practice-rls.int-spec.ts`, `admin-rls.int-spec.ts` and `dashboard-rls.int-spec.ts`.
