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
| `20261003155528_admin_manual_translations.sql` | V1 gap | Admins write manual translations: insert / update grants on `entity_type, entity_id, field, language, provider, source_hash, text`, delete grant; insert / update / delete policies `is_admin() and provider = 'manual'` |
| `20260930144044_dashboard.sql` | 5 | Views `v_user_exercise_results`, `v_user_skill_progress`, `v_user_activity` (security invoker); `activity_days(tz)`; select for `authenticated` only |
| `20261005075849_glossary.sql` | Glossary | `glossary_terms`; `glossary_phrases_valid()` (check), `glossary_terms_unique_phrases()` (phrase in one term, `23505` hint `match`), `glossary_terms_unlink_related()` (after delete); audit + `updated_at` triggers; RLS, grants |
| `20261004070728_admin_users.sql` | 9 | `admin_audit_log` (admins read; no API writes); `admin_user_rows()` (internal); `admin_list_users`, `admin_get_user`, `admin_set_role`, `admin_log_status_change` (security definer, `is_admin()` first) |

Glossary (`backend/seed/glossary/terms.json`, imported by `npm run seed:glossary`, `backend/src/glossary/`): about 100 QA terms in English and Vietnamese, matched by slug (new ids: UUID v5 of `glossary:<slug>`), inserted as `published`; never deletes, `--update` overwrites the texts but keeps the status an admin set; a term whose phrase a CMS-made term uses is skipped with a warning.

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
* `google` rows are written only with the service role (backend cache). `manual` rows by the curriculum importer (service role) and by admins in the CMS (as themselves: policies `is_admin() and provider = 'manual'`; the backend upserts, so the update grant covers every written column). Learners write nothing (a learner-written row would be shown to everyone): their insert is `42501`, their update / delete matches no row.

## `admin_audit_log` (Phase 9)

Who changed which user's role or account status. Written only by the `admin_*` functions below (no insert / update / delete grant for any API role), so rows cannot be forged, edited or removed through the API.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `actor_id` | uuid | FK → `profiles` on delete **set null** (the entry stays when the admin account goes) |
| `target_id` | uuid not null | FK → `profiles` on delete cascade. Index `(target_id, created_at desc)` |
| `action` | text | `role_changed` \| `disabled` \| `enabled` (check) |
| `from_value`, `to_value` | text ≤ 40 | role (`learner` / `admin`) or status (`active` / `disabled`) before and after |
| `created_at` | timestamptz | |

Account status itself is not stored in `public`: *disabled* is Supabase Auth's `auth.users.banned_until` (in the future), *verified* is `email_confirmed_at`.

## `glossary_terms`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `slug` | text unique | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 64. Anchor `/glossary#<slug>` |
| `term` | text | 1–80, trimmed |
| `vi_name` | text null | 1–80, trimmed |
| `skill_code` | text | FK → `skills(code)`. Index |
| `match_phrases` | text[] | `glossary_phrases_valid`: ≤ 10, each 2–60 and trimmed, unique in the term (case-insensitive); unique across terms by trigger |
| `definition_en`, `definition_vi` | text | 1–500 |
| `related_ids` | uuid[] | ≤ 8, not the row's own id. No FK (array): unknown ids are dropped on read, deleted terms removed by trigger |
| `status` | `content_status` | default `draft` |
| `created_by`, `updated_by` | uuid null | FK → `profiles` on delete set null; set by `set_content_audit()` |
| `created_at`, `updated_at` | timestamptz | |

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
* `set_content_audit()` — `before insert or update` on `courses`, `modules`, `lessons`, `exercises`, `glossary_terms`: `created_by` / `updated_by` = `auth.uid()` (kept as given when there is no user, e.g. the curriculum importer); `created_by` never changes on update.
* `reorder_content(kind, parent_id, ids[])` — invoker (RLS decides): sets `order_index` = position for the children of one parent (course → skill, module → course, lesson → module, exercise → lesson) in one statement; raises `22023` for duplicates, an unknown kind, or when not every id was updated (a child of another parent, or a caller who may not update — so learners get an error, not a silent no-op).
* `activity_days(time_zone)` — invoker, stable: the distinct local dates of the caller's (`auth.uid()`) activity, newest first, for the streak (one row per day, so the API row limit is not hit). An unknown zone raises `22023`. Executable by `authenticated` only.
* `admin_user_rows()` — invoker, stable, **no execute grant** for API roles: one row per user joining `profiles` and `auth.users` (email, verified, disabled, last sign-in) with completed published lessons and attempted exercises. Only the functions below call it.
* `admin_list_users(search, role, status, limit, offset)` — **security definer** (it reads `auth.users`), stable: raises `42501` unless `is_admin()`, `22023` for an unknown status or a page outside 1–100 / offset < 0. Returns `{ total, items }` (jsonb), newest first; search is `ilike` on email or display name with `\`, `%`, `_` escaped.
* `admin_get_user(user_id)` — security definer: `42501` unless admin; the user's row (jsonb) or nothing.
* `admin_set_role(user_id, role)` — security definer: one role change at a time (`pg_advisory_xact_lock`), then the caller must still be an admin (`42501`; so two admins cannot demote each other at once), the target exists (`P0002`), is not the caller (`P0001` hint `self`), and is not disabled when promoted (`P0001` hint `disabled`). The same role is a no-op; otherwise updates `profiles.role` and inserts the audit row in the same transaction.
* `admin_log_status_change(user_id, disabled)` — security definer: `42501` unless admin, `P0002` unknown user, `P0001` hint `state` when `auth.users` does not show that state. Called by the backend after it banned / unbanned the account with the Auth admin API, so the log only records what happened.
* `glossary_phrases_valid(phrases[])` — immutable, used by the `match_phrases` check (a check cannot hold a subquery).
* `glossary_terms_unique_phrases()` — `before insert or update of match_phrases`, invoker (only admins and the service role write, and they see every row): serialised by `pg_advisory_xact_lock`, raises `23505` with hint `match` and the phrase in `detail` when another term has the phrase (case-insensitive).
* `glossary_terms_unlink_related()` — `after delete`: removes the deleted id from every `related_ids`.
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
| `content_translations` | select when the content is published (`is_content_published`); exercise review texts only after an own attempt at that exercise | select all; insert / update / delete `manual` rows only | none |
| `glossary_terms` | select `published` | select all; insert / update / delete (no `id`, audit columns or timestamps) | none |
| `admin_audit_log` | **none** (select matches no row) | select all; **no writes** (only through `admin_set_role` / `admin_log_status_change`) | none |

* Content writes (Phase 4): the grants are to `authenticated`, the policies allow admins only (`is_admin()`). A learner's insert is `42501`; a learner's update / delete matches no row (RLS) and changes nothing. Column grants: nobody writes `id`, `created_by`, `updated_by` or timestamps; nobody updates a module's `course_id`, a lesson's `module_id`, an exercise's `lesson_id` or `type` (content does not move, types do not change). Hard deletes of content with progress or attempts fail on the `restrict` foreign keys (`23503`); cascaded children and translations go with an allowed delete.
* No delete on `lesson_progress`. Column grants keep `id`, `created_at`, `updated_at` unwritable; `user_id`/`lesson_id` are in the update grant only because upserts set them, and the trigger keeps them unchanged.
* `profiles.role`, `id` and timestamps are read-only for every API role, admins included (column-level grants). An attempt returns Postgres `42501`. Admins change roles only through `admin_set_role` (security definer, audited).
* Learner API queries filter on `status = 'published'` on top of RLS, so admins see what learners see on learner endpoints.

* Answer keys are read by the backend with the service role only, to grade and to build the review of the user's own attempt.

Verified by `backend/test/integration/profiles-rls.int-spec.ts`, `learning-rls.int-spec.ts`, `translations-rls.int-spec.ts`, `practice-rls.int-spec.ts`, `admin-rls.int-spec.ts`, `dashboard-rls.int-spec.ts`, `admin-users-rls.int-spec.ts` and `glossary-rls.int-spec.ts`.
