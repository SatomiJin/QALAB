-- Phase 2: learning content (skills → courses → modules → lessons) and
-- per-user lesson progress.

create type public.content_status as enum ('draft', 'published', 'archived');

create type public.lesson_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

-- Skills --------------------------------------------------------------------
-- Fixed list of learning tracks (plant.md › Core Learning Tracks). Reference
-- data, so it is inserted here rather than in seed.sql.

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default ''
    check (char_length(description) <= 500),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger skills_set_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

insert into public.skills (code, name, description, order_index) values
  ('fundamentals', 'QA Fundamentals', 'What testing is, why it matters, SDLC and STLC.', 1),
  ('testing_types', 'Testing Types', 'Functional, non-functional, smoke, regression and more.', 2),
  ('test_design', 'Test Design Techniques', 'Equivalence partitioning, boundary values, decision tables, state transitions.', 3),
  ('test_docs', 'Test Documentation', 'Test plans, test cases, test runs and reports.', 4),
  ('defect_mgmt', 'Defect Management', 'Writing bug reports, severity vs priority, defect life cycle.', 5),
  ('api_testing', 'API Testing', 'HTTP, REST, status codes and API test cases.', 6),
  ('automation', 'Automation Testing', 'When to automate, test pyramid, UI and API automation.', 7);

-- Content -------------------------------------------------------------------
-- Every content table: status (draft → published → archived), order_index
-- within its parent, and audit columns. Slugs: lowercase a-z0-9 and dashes.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills (id),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  description text not null default ''
    check (char_length(description) <= 2000),
  status public.content_status not null default 'draft',
  order_index integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default ''
    check (char_length(description) <= 2000),
  status public.content_status not null default 'draft',
  order_index integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  content_md text not null default ''
    check (char_length(content_md) <= 100000),
  estimated_minutes integer not null default 5
    check (estimated_minutes between 1 and 600),
  status public.content_status not null default 'draft',
  order_index integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create index courses_skill_order_idx on public.courses (skill_id, order_index);
create index modules_course_order_idx on public.modules (course_id, order_index);
create index lessons_module_order_idx on public.lessons (module_id, order_index);

-- True when the lesson, its module and its course are all published, i.e. a
-- learner may see it. Checks the statuses explicitly (admins can read drafts).
create function public.is_lesson_published(p_lesson_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = p_lesson_id
      and l.status = 'published'
      and m.status = 'published'
      and c.status = 'published'
  );
$$;

revoke execute on function public.is_lesson_published(uuid) from public, anon;
grant execute on function public.is_lesson_published(uuid) to authenticated;

-- Lesson progress -----------------------------------------------------------

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- restrict: content with learner progress is archived, never hard-deleted.
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  status public.lesson_status not null default 'not_started',
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  check ((status = 'completed') = (completed_at is not null)),
  check (status = 'not_started' or started_at is not null)
);

create index lesson_progress_user_accessed_idx
  on public.lesson_progress (user_id, last_accessed_at desc);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

-- Progress only moves forward, whoever writes it: the percentage never drops,
-- a completed lesson stays completed, and the start time never changes. This
-- also makes concurrent writes (scroll updates racing "mark complete") safe.
create function public.lesson_progress_forward_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.lesson_id := old.lesson_id;
    new.started_at := coalesce(old.started_at, new.started_at);
    new.progress_percent := greatest(old.progress_percent, new.progress_percent);
    if old.status = 'completed' then
      new.status := 'completed';
      new.completed_at := old.completed_at;
    elsif new.status = 'not_started' and old.status = 'in_progress' then
      new.status := 'in_progress';
    end if;
  end if;

  if new.status = 'completed' then
    new.progress_percent := 100;
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;

  if new.status <> 'not_started' then
    new.started_at := coalesce(new.started_at, now());
  end if;

  return new;
end;
$$;

create trigger lesson_progress_forward_only
before insert or update on public.lesson_progress
for each row execute function public.lesson_progress_forward_only();

-- Row Level Security --------------------------------------------------------
-- Learners see published content whose parents are published too. Admins see
-- everything (write policies arrive with the Admin CMS in Phase 4).

alter table public.skills enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

create policy "skills: read"
on public.skills
for select
to authenticated
using (true);

create policy "courses: read published, admins read all"
on public.courses
for select
to authenticated
using (status = 'published' or (select public.is_admin()));

create policy "modules: read published, admins read all"
on public.modules
for select
to authenticated
using (
  (select public.is_admin())
  or (
    status = 'published'
    and exists (
      select 1
      from public.courses c
      where c.id = course_id
        and c.status = 'published'
    )
  )
);

create policy "lessons: read published, admins read all"
on public.lessons
for select
to authenticated
using (
  (select public.is_admin())
  or (
    status = 'published'
    and exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id
        and m.status = 'published'
        and c.status = 'published'
    )
  )
);

create policy "lesson_progress: read own, admins read all"
on public.lesson_progress
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "lesson_progress: insert own on published lessons"
on public.lesson_progress
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_lesson_published(lesson_id)
);

create policy "lesson_progress: update own on published lessons"
on public.lesson_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and public.is_lesson_published(lesson_id)
);

-- Privileges ----------------------------------------------------------------
-- Content is read-only for API roles. Progress rows are never deleted by
-- clients; ids and audit timestamps are not writable. `user_id` and
-- `lesson_id` are in the update grant only because an upsert sets every
-- column it inserts; the trigger keeps them unchanged.

revoke all on public.skills, public.courses, public.modules, public.lessons,
  public.lesson_progress from anon, authenticated;

grant select on public.skills, public.courses, public.modules, public.lessons
  to authenticated;

grant select on public.lesson_progress to authenticated;
grant insert (user_id, lesson_id, status, progress_percent, started_at,
  completed_at, last_accessed_at)
  on public.lesson_progress to authenticated;
grant update (user_id, lesson_id, status, progress_percent, started_at,
  completed_at, last_accessed_at)
  on public.lesson_progress to authenticated;
