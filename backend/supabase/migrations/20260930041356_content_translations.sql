-- Translations of learning content (courses, modules, lessons), per field
-- and language. Two providers:
--   manual — written by a person (seed now, Admin CMS later). Preferred.
--   google — machine translation made on demand and cached by the backend.
-- `source_hash` (sha-256 of the English source) ties a row to the exact
-- source text: an edited source makes both kinds stale. Machine rows also
-- record the backend's `pipeline_version`, so a pipeline change redoes
-- them without touching manual rows. Written only with the service role
-- (seed / backend), never by an API role.

create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('course', 'module', 'lesson')),
  entity_id uuid not null,
  field text not null check (field in ('title', 'description', 'content_md')),
  language text not null check (language in ('vi')),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  text text not null check (char_length(text) <= 200000),
  provider text not null check (provider in ('manual', 'google')),
  pipeline_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A manual and a machine translation can coexist; reads prefer manual.
  unique (entity_type, entity_id, field, language, provider),
  check ((provider = 'google') = (pipeline_version is not null))
);

create index content_translations_entity_idx
  on public.content_translations (entity_id, language);

create trigger content_translations_set_updated_at
before update on public.content_translations
for each row execute function public.set_updated_at();

-- The table is polymorphic (no FK), so deleting content removes its
-- translations with a trigger. Cascades (course → modules → lessons) fire it
-- for every deleted row.
create function public.delete_content_translations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.content_translations
  where entity_type = tg_argv[0]
    and entity_id = old.id;
  return old;
end;
$$;

revoke execute on function public.delete_content_translations()
  from public, anon, authenticated;

create trigger courses_delete_translations
after delete on public.courses
for each row execute function public.delete_content_translations('course');

create trigger modules_delete_translations
after delete on public.modules
for each row execute function public.delete_content_translations('module');

create trigger lessons_delete_translations
after delete on public.lessons
for each row execute function public.delete_content_translations('lesson');

-- True when a learner may see the content row: it and every parent are
-- published. Statuses are checked explicitly (admins can read drafts).
create function public.is_content_published(p_entity_type text, p_entity_id uuid)
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
    else false
  end;
$$;

revoke execute on function public.is_content_published(text, uuid)
  from public, anon;
grant execute on function public.is_content_published(text, uuid)
  to authenticated;

-- Row Level Security --------------------------------------------------------
-- Learners read translations of content they can see; a translation must not
-- leak the text of content that was unpublished later. No API role writes.

alter table public.content_translations enable row level security;

create policy "content_translations: read published, admins read all"
on public.content_translations
for select
to authenticated
using (
  (select public.is_admin())
  or public.is_content_published(entity_type, entity_id)
);

revoke all on public.content_translations from anon, authenticated;
grant select on public.content_translations to authenticated;
