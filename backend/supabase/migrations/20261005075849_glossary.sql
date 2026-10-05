-- Glossary: QA terms with English and Vietnamese definitions, edited by
-- admins in the CMS, read by learners (published only). Lesson text links a
-- term wherever one of its match phrases appears, so a phrase belongs to at
-- most one term.

-- Phrases: 0-10, each 2-60 characters, trimmed, unique within the term
-- (case-insensitive). A check constraint cannot hold a subquery, so the rule
-- is an immutable function.
create function public.glossary_phrases_valid(phrases text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(phrases) <= 10
    and not exists (
      select 1 from unnest(phrases) as p
      where p is null or p <> btrim(p) or char_length(p) not between 2 and 60
    )
    and (select count(distinct lower(p)) from unnest(phrases) as p)
      = cardinality(phrases);
$$;

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  -- Anchor on the glossary page (`/glossary#<slug>`).
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 64),
  term text not null
    check (char_length(btrim(term)) between 1 and 80 and term = btrim(term)),
  vi_name text
    check (vi_name is null or (char_length(btrim(vi_name)) between 1 and 80
      and vi_name = btrim(vi_name))),
  skill_code text not null references public.skills (code),
  match_phrases text[] not null default '{}'
    check (public.glossary_phrases_valid(match_phrases)),
  definition_en text not null
    check (char_length(btrim(definition_en)) between 1 and 500),
  definition_vi text not null
    check (char_length(btrim(definition_vi)) between 1 and 500),
  -- No foreign keys in an array: unknown ids are dropped on read, and a
  -- deleted term is removed from the others by a trigger.
  related_ids uuid[] not null default '{}'
    check (cardinality(related_ids) <= 8 and not (id = any (related_ids))),
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index glossary_terms_skill_idx on public.glossary_terms (skill_code);

create trigger glossary_terms_set_updated_at
before update on public.glossary_terms
for each row execute function public.set_updated_at();

create trigger glossary_terms_set_audit
before insert or update on public.glossary_terms
for each row execute function public.set_content_audit();

-- A phrase used by another term is a unique violation (23505, hint `match`,
-- the phrase in `detail`). Serialised so two admins cannot add the same
-- phrase at once. Invoker rights: only admins and the service role write,
-- and both see every row.
create function public.glossary_terms_unique_phrases()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  taken text;
begin
  perform pg_advisory_xact_lock(hashtext('public.glossary_terms.match_phrases'));
  select b into taken
  from public.glossary_terms as g,
    unnest(g.match_phrases) as a,
    unnest(new.match_phrases) as b
  where g.id <> new.id and lower(a) = lower(b)
  limit 1;
  if taken is not null then
    raise exception 'glossary phrase already used'
      using errcode = '23505', hint = 'match', detail = taken;
  end if;
  return new;
end;
$$;

create trigger glossary_terms_unique_phrases
before insert or update of match_phrases on public.glossary_terms
for each row execute function public.glossary_terms_unique_phrases();

create function public.glossary_terms_unlink_related()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.glossary_terms
  set related_ids = array_remove(related_ids, old.id)
  where old.id = any (related_ids);
  return old;
end;
$$;

create trigger glossary_terms_unlink_related
after delete on public.glossary_terms
for each row execute function public.glossary_terms_unlink_related();

-- RLS ------------------------------------------------------------------------

alter table public.glossary_terms enable row level security;

create policy "glossary_terms: read published, admins all"
on public.glossary_terms for select to authenticated
using (status = 'published' or (select public.is_admin()));

create policy "glossary_terms: admins insert"
on public.glossary_terms for insert to authenticated
with check ((select public.is_admin()));

create policy "glossary_terms: admins update"
on public.glossary_terms for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "glossary_terms: admins delete"
on public.glossary_terms for delete to authenticated
using ((select public.is_admin()));

revoke all on public.glossary_terms from anon, authenticated;
grant select on public.glossary_terms to authenticated;
grant insert (slug, term, vi_name, skill_code, match_phrases, definition_en,
  definition_vi, related_ids, status)
  on public.glossary_terms to authenticated;
grant update (slug, term, vi_name, skill_code, match_phrases, definition_en,
  definition_vi, related_ids, status)
  on public.glossary_terms to authenticated;
grant delete on public.glossary_terms to authenticated;

revoke execute on function public.glossary_phrases_valid(text[]) from public, anon;
grant execute on function public.glossary_phrases_valid(text[]) to authenticated;
revoke execute on function public.glossary_terms_unique_phrases() from public, anon, authenticated;
revoke execute on function public.glossary_terms_unlink_related() from public, anon, authenticated;
