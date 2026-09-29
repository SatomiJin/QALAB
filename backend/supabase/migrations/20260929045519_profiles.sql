-- Phase 1: user profiles, roles, and the helpers every later RLS policy uses.

create type public.user_role as enum ('learner', 'admin');

create type public.experience_level as enum (
  'beginner',
  'some_qa',
  'working_qa',
  'automation_qa'
);

-- Shared trigger function: keeps `updated_at` current on every table.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 80),
  experience_level public.experience_level,
  learning_goals text[] not null default '{}'
    check (cardinality(learning_goals) <= 10),
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Changed only directly in the database. No API or client role may update it.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-provision a profile for every new auth user. `display_name` comes from
-- the signup metadata; fall back to the email local part.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if v_name = '' then
    v_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'learner');
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 80));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill users created before this migration.
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'learner'
    ),
    80
  )
from auth.users u
on conflict (id) do nothing;

-- True when the current JWT belongs to an admin. `security definer` so it can
-- read `profiles` from inside RLS policies without recursing into them.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Row Level Security --------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: read own, admins read all"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Privileges: rows are created only by the trigger and never deleted by
-- clients. Column-level grants keep `role` (and ids/timestamps) read-only
-- for every API role, admins included.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, experience_level, learning_goals)
  on public.profiles to authenticated;
