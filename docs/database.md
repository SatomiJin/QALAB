# Database

Supabase PostgreSQL (cloud project, linked from `backend/`). Every change is a migration in `backend/supabase/migrations`, applied with `npx supabase db push`.

## Migrations

| File | Phase | Contents |
|---|---|---|
| `20260929045519_profiles.sql` | 1 | Enums `user_role`, `experience_level`; `set_updated_at()`; `profiles` + trigger from `auth.users`; `is_admin()`; RLS and grants |

## `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` on delete cascade |
| `display_name` | text not null | 1–80 characters after trim (check) |
| `experience_level` | `experience_level` | nullable |
| `learning_goals` | text[] not null default `{}` | at most 10 (check) |
| `role` | `user_role` not null default `learner` | changed only in the database |
| `created_at`, `updated_at` | timestamptz | `updated_at` kept by trigger |

* Created by the `on_auth_user_created` trigger (`handle_new_user()`, `security definer`). `display_name` comes from signup metadata `display_name`, falling back to the email local part. The migration also backfills users that existed before it.

## Helpers

* `is_admin()` — `security definer`, `stable`: true when `auth.uid()` has `role = 'admin'`. Security definer lets policies on `profiles` call it without recursing into RLS. Executable by `authenticated` only.
* `set_updated_at()` — shared `before update` trigger function for every table.

## RLS and privileges on `profiles`

| Action | `authenticated` (learner) | Admin | `anon` |
|---|---|---|---|
| select | own row | all rows (`is_admin()`) | none |
| update | own row, only `display_name`, `experience_level`, `learning_goals` | same as learner | none |
| insert / delete | none (trigger / cascade only) | none | none |

Column-level `grant update (...)` keeps `role`, `id` and timestamps read-only for every API role, admins included. An attempt returns Postgres `42501` (insufficient privilege).

Verified by `backend/test/integration/profiles-rls.int-spec.ts`.
