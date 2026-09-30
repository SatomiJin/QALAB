---
paths:
  - "backend/supabase/**"
  - "backend/src/**/*.repository.ts"
  - "backend/test/integration/**"
---

# Database rules (Supabase Postgres)

Cloud project linked from `backend/`. No Docker, no local database. Current schema: [docs/database.md](../../docs/database.md).

## Migrations

* Every change is a new file: `cd backend && npx supabase migration new <snake_name>`. Never edit a migration that has been pushed; write a new one. Before editing any existing migration, check `npx supabase migration list`: if the version has a `remote` value it is pushed, even when you did not push it yourself (the user may have). Example: `20260930064552_content_translations_manual` exists because `20260930041356` was edited after it had been pushed.
* Apply with `npx supabase db push` (from `backend/`). Pushing changes the shared cloud database: say so before doing it.
* One migration per feature/phase is fine; keep it readable with section comments.
* Record each migration in the table in `docs/database.md`.
* Check with `npx supabase db push --dry-run [--include-seed]` first. The push itself needs the user's permission (the agent may be blocked from running it): if so, finish everything else and hand the exact command to the user, then run `npm run test:int`.
* `db push --include-seed` runs `seed.sql` only the **first** time. When the file changed after that, the dry-run says `(hash update)` and the push only records the new hash, without running anything. To apply new seed rows, run the (idempotent) seed again: `npx supabase db query --linked -f supabase/seed.sql`, then verify the rows exist.
* Reference data the app depends on (e.g. the 7 skills) goes in a migration. Sample/demo content goes in `supabase/seed.sql` with fixed UUIDs and `on conflict do nothing`, so re-running is safe.

## Every table

* `alter table … enable row level security;` in the same migration that creates it. No table without policies.
* `created_at timestamptz not null default now()`, `updated_at` kept by the shared `set_updated_at()` trigger.
* Constraints mirror the DTO limits (`check` on length, counts, ranges). The DB is the last line of validation.
* Foreign keys to `auth.users(id)` / `profiles(id)` for owned rows use `on delete cascade`; audit columns (`created_by`, `updated_by`) use `on delete set null`.
* Rows that learners build on (progress, attempts) reference content with `on delete restrict`: content with learner data is archived, never hard-deleted.
* Content tables: `status content_status default 'draft'`, `order_index`, audit columns; slugs checked with `^[a-z0-9]+(-[a-z0-9]+)*$`. Index `(parent_id, order_index)`.
* State that must only move one way (progress %, completed status, first-start time) is enforced by a `before insert or update` trigger, not only in the service: direct PostgREST writes and concurrent requests must not undo it (see `lesson_progress_forward_only`).
* Enums as Postgres enum types; list the values in `docs/database.md` and the DTO.

## RLS and privileges

* Policies are written per action (`select`, `insert`, `update`, `delete`) and per role (`authenticated`). `anon` gets nothing unless a public read is required.
* Owner rows: `using (user_id = auth.uid())` and `with check (user_id = auth.uid())`.
* Admin: `is_admin()` (security definer, stable). Never query `profiles` directly inside a `profiles` policy (recursion).
* Learner visibility of nested content: the row **and every parent** is `published` (`exists` on the parent in the policy). Write policies on learner rows that point at content check `is_lesson_published(...)` (or the equivalent helper), so learners cannot attach data to drafts.
* Caches of server-generated data (translations): no API write privileges at all, written with the service role; a read policy that checks the source's visibility; `source_hash` (sha-256 hex of the source; compute it in SQL with `encode(sha256(convert_to(text, 'UTF8')), 'hex')` when seeding) to detect stale rows; a `provider` column when people and machines both write, with the provider in the unique key. Polymorphic tables (no FK) get `after delete` triggers on every source table.
* Upserts from supabase-js set every column in the payload on conflict, so the column `update` grant must include them; protect identity columns (`user_id`, FK ids) in the trigger instead.
* Columns a user must not change (`role`, `id`, scores, timestamps): revoke table update and `grant update (col, …)` only on editable columns.
* Answer keys live in a table with **no** policy for `authenticated`; only `service()` reads them.
* `security definer` functions: `set search_path = ''`, fully qualified names, `revoke execute … from public`, grant to the roles that need it.

## Verification

* Every policy has an integration test in `backend/test/integration/` that acts as a real user with supabase-js: own row allowed, other user's row denied, admin path, protected columns (`42501`).
* After a schema change, update `docs/database.md` (tables, helpers, RLS matrix).
