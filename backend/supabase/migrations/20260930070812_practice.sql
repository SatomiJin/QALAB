-- Phase 3: practice. Exercises belong to lessons; their answer keys live in a
-- separate table no API role can read; attempts are graded and written by
-- the backend (service role), never by the learner.

create type public.exercise_type as enum (
  'multiple_choice',
  'classification',
  'test_case',
  'bug_report',
  'scenario'
);

create type public.difficulty as enum ('easy', 'medium', 'hard');

-- Exercises -----------------------------------------------------------------
-- `prompt_data` is the public part (options, items, categories) and is safe
-- to show learners. Its shape per type is validated by the backend.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type public.exercise_type not null,
  question text not null check (char_length(btrim(question)) between 1 and 2000),
  prompt_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(prompt_data) = 'object'
      and octet_length(prompt_data::text) <= 20000),
  difficulty public.difficulty not null default 'easy',
  status public.content_status not null default 'draft',
  order_index integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_lesson_order_idx on public.exercises (lesson_id, order_index);

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

-- Answer keys ---------------------------------------------------------------
-- `answer_data`: correct options / mapping / expected concepts, model answer
-- and self-assessment rubric. `explanation` is stored here too (not on
-- `exercises`): it usually gives the answer away, so learners get it only in
-- the result of their own attempt.

create table public.exercise_answers (
  exercise_id uuid primary key references public.exercises (id) on delete cascade,
  answer_data jsonb not null
    check (jsonb_typeof(answer_data) = 'object'
      and octet_length(answer_data::text) <= 50000),
  explanation text not null default ''
    check (char_length(explanation) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exercise_answers_set_updated_at
before update on public.exercise_answers
for each row execute function public.set_updated_at();

-- Attempts ------------------------------------------------------------------
-- Written by the backend after grading (service role): the score, verdict and
-- feedback are never client data. The learner may add a self-assessment once
-- (free-text types); nothing else about an attempt ever changes.

create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- restrict: content with attempts is archived, never hard-deleted.
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  answer jsonb not null
    check (jsonb_typeof(answer) = 'object'
      and octet_length(answer::text) <= 60000),
  score integer not null check (score between 0 and 100),
  is_correct boolean not null,
  feedback jsonb not null
    check (jsonb_typeof(feedback) = 'object'
      and octet_length(feedback::text) <= 60000),
  self_assessment jsonb
    check (self_assessment is null
      or (jsonb_typeof(self_assessment) = 'object'
        and octet_length(self_assessment::text) <= 5000)),
  attempted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercise_attempts_user_attempted_idx
  on public.exercise_attempts (user_id, attempted_at desc);
create index exercise_attempts_exercise_idx
  on public.exercise_attempts (exercise_id);

create trigger exercise_attempts_set_updated_at
before update on public.exercise_attempts
for each row execute function public.set_updated_at();

-- Attempts are immutable, whoever writes: only `self_assessment` may change,
-- and only from empty to a value.
create function public.exercise_attempts_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.self_assessment is not null then
    raise exception 'The self-assessment of an attempt can be saved only once'
      using errcode = '23514';
  end if;
  new.id := old.id;
  new.user_id := old.user_id;
  new.exercise_id := old.exercise_id;
  new.answer := old.answer;
  new.score := old.score;
  new.is_correct := old.is_correct;
  new.feedback := old.feedback;
  new.attempted_at := old.attempted_at;
  return new;
end;
$$;

create trigger exercise_attempts_immutable
before update on public.exercise_attempts
for each row execute function public.exercise_attempts_immutable();

-- True when the exercise and its lesson, module and course are published.
create function public.is_exercise_published(p_exercise_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercises e
    where e.id = p_exercise_id
      and e.status = 'published'
      and public.is_lesson_published(e.lesson_id)
  );
$$;

revoke execute on function public.is_exercise_published(uuid) from public, anon;
grant execute on function public.is_exercise_published(uuid) to authenticated;

-- Row Level Security --------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.exercise_answers enable row level security;
alter table public.exercise_attempts enable row level security;

create policy "exercises: read published, admins read all"
on public.exercises
for select
to authenticated
using (
  (select public.is_admin())
  or (status = 'published' and public.is_lesson_published(lesson_id))
);

-- No learner policy at all: only the backend (service role) and admins read
-- answer keys.
create policy "exercise_answers: admins read"
on public.exercise_answers
for select
to authenticated
using ((select public.is_admin()));

create policy "exercise_attempts: read own, admins read all"
on public.exercise_attempts
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "exercise_attempts: self-assess own on published exercises"
on public.exercise_attempts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and public.is_exercise_published(exercise_id)
);

-- Privileges ----------------------------------------------------------------
-- Content and answer keys are read-only for API roles (admin writes arrive
-- with the Admin CMS). Attempts: no insert or delete; update only the
-- self-assessment.

revoke all on public.exercises, public.exercise_answers, public.exercise_attempts
  from anon, authenticated;

grant select on public.exercises, public.exercise_answers, public.exercise_attempts
  to authenticated;
grant update (self_assessment) on public.exercise_attempts to authenticated;

-- Translations of exercises ------------------------------------------------
-- Public texts: `question`, `option.<id>`, `item.<id>`, `category.<id>`.
-- Review texts, shown only in the result of an attempt: `explanation`,
-- `model_answer`, `rubric.<id>`. A learner reads a review text only after
-- attempting that exercise (otherwise the translation would leak the answer).

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.content_translations'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ~ '''lesson''::text'
        or pg_get_constraintdef(oid) ~ '''content_md''::text'
      )
  loop
    execute format(
      'alter table public.content_translations drop constraint %I',
      c.conname
    );
  end loop;
end;
$$;

alter table public.content_translations
  add constraint content_translations_entity_type_check
    check (entity_type in ('course', 'module', 'lesson', 'exercise')),
  add constraint content_translations_field_check
    check (field ~ '^(title|description|content_md|question|explanation|model_answer|(option|item|category|rubric)\.[a-z0-9][a-z0-9_-]{0,39})$');

create trigger exercises_delete_translations
after delete on public.exercises
for each row execute function public.delete_content_translations('exercise');

create or replace function public.is_content_published(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_entity_type
    when 'course' then exists (
      select 1 from public.courses c
      where c.id = p_entity_id and c.status = 'published'
    )
    when 'module' then exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = p_entity_id
        and m.status = 'published'
        and c.status = 'published'
    )
    when 'lesson' then public.is_lesson_published(p_entity_id)
    when 'exercise' then public.is_exercise_published(p_entity_id)
    else false
  end;
$$;

drop policy "content_translations: read published, admins read all"
  on public.content_translations;

create policy "content_translations: read published, admins read all"
on public.content_translations
for select
to authenticated
using (
  (select public.is_admin())
  or (
    public.is_content_published(entity_type, entity_id)
    and (
      entity_type <> 'exercise'
      or not (field in ('explanation', 'model_answer') or field like 'rubric.%')
      or exists (
        select 1
        from public.exercise_attempts a
        where a.exercise_id = entity_id
          and a.user_id = (select auth.uid())
      )
    )
  )
);
