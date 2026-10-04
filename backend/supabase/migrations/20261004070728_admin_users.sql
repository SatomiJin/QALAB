-- Phase 9: admin user management.
--
-- Admins list and inspect users, change roles and disable accounts. Emails,
-- verification and sign-in times live in auth.users, which no API role can
-- read: the read functions below are SECURITY DEFINER and check is_admin()
-- first. Role changes happen entirely here (as the admin, no service role).
-- Disabling is a Supabase Auth ban, done by the backend with the service role
-- (the Auth admin API); the audit row is then written here, and only when the
-- ban really is in place.

-- Audit log -----------------------------------------------------------------------

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  target_id uuid not null references public.profiles (id) on delete cascade,
  action text not null
    check (action in ('role_changed', 'disabled', 'enabled')),
  from_value text check (char_length(from_value) <= 40),
  to_value text check (char_length(to_value) <= 40),
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Who changed which user, when. Written only by the admin_* functions; immutable.';

create index admin_audit_log_target_idx
  on public.admin_audit_log (target_id, created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log: admins read"
on public.admin_audit_log
for select
to authenticated
using ((select public.is_admin()));

-- No insert / update / delete for any API role: rows come from the functions.
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

-- User rows (internal) --------------------------------------------------------------

-- One row per user with what the admin pages show. Not callable by API roles;
-- the admin_* functions below call it after their is_admin() check.
-- lessons_completed counts published lessons only (same as the dashboard).
create function public.admin_user_rows()
returns table (
  id uuid,
  email text,
  display_name text,
  role public.user_role,
  experience_level public.experience_level,
  learning_goals text[],
  email_verified boolean,
  disabled boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  lessons_completed int,
  exercises_attempted int
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.experience_level,
    p.learning_goals,
    u.email_confirmed_at is not null,
    coalesce(u.banned_until > now(), false),
    p.created_at,
    u.last_sign_in_at,
    (
      select count(*)::int
      from public.lesson_progress lp
      where lp.user_id = p.id
        and lp.status = 'completed'
        and public.is_lesson_published(lp.lesson_id)
    ),
    (
      select count(distinct a.exercise_id)::int
      from public.exercise_attempts a
      where a.user_id = p.id
    )
  from public.profiles p
  join auth.users u on u.id = p.id;
$$;

revoke execute on function public.admin_user_rows() from public, anon, authenticated;

-- Reads -----------------------------------------------------------------------------

-- A page of users, newest first, as { total, items }. Search: email or display
-- name contains the text (case-insensitive, % and _ taken literally). Status:
-- 'disabled' (banned), 'unverified' (not banned, email not confirmed),
-- 'active' (neither). Past the end: empty items with the real total.
create function public.admin_list_users(
  p_search text,
  p_role public.user_role,
  p_status text,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pattern text;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('active', 'disabled', 'unverified') then
    raise exception 'unknown status' using errcode = '22023';
  end if;
  if p_limit not between 1 and 100 or p_offset < 0 then
    raise exception 'invalid page' using errcode = '22023';
  end if;

  if nullif(btrim(p_search), '') is not null then
    v_pattern := '%' || replace(replace(replace(btrim(p_search),
      '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with matching as (
    select r.*
    from public.admin_user_rows() r
    where (v_pattern is null
        or r.email ilike v_pattern
        or r.display_name ilike v_pattern)
      and (p_role is null or r.role = p_role)
      and (
        p_status is null
        or (p_status = 'disabled' and r.disabled)
        or (p_status = 'unverified' and not r.disabled and not r.email_verified)
        or (p_status = 'active' and not r.disabled and r.email_verified)
      )
  ),
  page as (
    select *
    from matching
    order by created_at desc, id
    limit p_limit
    offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from matching),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id) from page),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- One user, or no row when the id is unknown.
create function public.admin_get_user(p_user_id uuid)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select to_jsonb(r)
    from public.admin_user_rows() r
    where r.id = p_user_id;
end;
$$;

-- Role changes ------------------------------------------------------------------------

-- Changes a user's role and logs it, in one transaction. Rules:
-- * the caller is an admin (re-checked after the lock, so two admins cannot
--   demote each other at the same time);
-- * nobody changes their own role. With that, the caller stays an admin, so
--   there is always at least one admin;
-- * a disabled account is not promoted (enable it first);
-- * the same role is a no-op (no audit row).
-- Errors: 42501 not an admin, P0002 unknown user, P0001 with hint 'self' or
-- 'disabled' for the rules.
create function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.user_role;
  v_disabled boolean;
begin
  if p_user_id = v_actor then
    raise exception 'You cannot change your own role'
      using errcode = 'P0001', hint = 'self';
  end if;

  -- One role change at a time, then check the caller again.
  perform pg_advisory_xact_lock(hashtext('public.admin_set_role'));
  if not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin'
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select p.role, coalesce(u.banned_until > now(), false)
  into v_old, v_disabled
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id
  for update of p;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if v_old = p_role then
    return;
  end if;
  if p_role = 'admin' and v_disabled then
    raise exception 'Enable the account before making it an admin'
      using errcode = 'P0001', hint = 'disabled';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.admin_audit_log (actor_id, target_id, action, from_value, to_value)
  values (v_actor, p_user_id, 'role_changed', v_old::text, p_role::text);
end;
$$;

-- Account status -------------------------------------------------------------------------

-- Logs a disable / enable after the backend has banned / unbanned the account
-- in Supabase Auth. It records only what is true: the ban state in auth.users
-- must match p_disabled (P0001 hint 'state' otherwise), so no admin can write
-- an entry for something that did not happen.
create function public.admin_log_status_change(p_user_id uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_disabled boolean;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select coalesce(u.banned_until > now(), false)
  into v_disabled
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if v_disabled is distinct from p_disabled then
    raise exception 'The account status does not match'
      using errcode = 'P0001', hint = 'state';
  end if;

  insert into public.admin_audit_log (actor_id, target_id, action, from_value, to_value)
  values (
    v_actor,
    p_user_id,
    case when p_disabled then 'disabled' else 'enabled' end,
    case when p_disabled then 'active' else 'disabled' end,
    case when p_disabled then 'disabled' else 'active' end
  );
end;
$$;

-- Privileges -----------------------------------------------------------------------------

revoke execute on function public.admin_list_users(text, public.user_role, text, int, int)
  from public, anon;
revoke execute on function public.admin_get_user(uuid) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_log_status_change(uuid, boolean) from public, anon;

grant execute on function public.admin_list_users(text, public.user_role, text, int, int)
  to authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_log_status_change(uuid, boolean) to authenticated;

comment on column public.profiles.role is
  'Changed only by public.admin_set_role (admins, audited) or directly in the database. No API role has an update grant on it.';
