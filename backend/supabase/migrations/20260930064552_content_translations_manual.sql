-- Manual (human-written) translations next to cached machine ones.
--   manual — written by a person (seed now, Admin CMS later). Preferred.
--   google — machine translation made on demand and cached by the backend;
--            `pipeline_version` records the backend pipeline that made it,
--            so a pipeline change redoes machine rows only.
-- A manual and a machine row may coexist for the same field; reads prefer
-- manual. Idempotent: it upgrades the table created by
-- 20260930041356_content_translations and is a no-op shape-wise on a
-- database where that migration already has the final columns.

alter table public.content_translations
  add column if not exists pipeline_version integer;

alter table public.content_translations
  alter column provider drop default;

-- Machine rows cached before pipeline versions existed are just a cache:
-- drop them, the backend translates again on demand.
delete from public.content_translations
where provider = 'google' and pipeline_version is null;

-- Replace the provider check and the unique key (constraint names differ
-- between databases, so find them by shape).
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.content_translations'::regclass
      and (
        contype = 'u'
        or (contype = 'c' and pg_get_constraintdef(oid) ~ 'provider')
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
  add constraint content_translations_provider_check
    check (provider in ('manual', 'google')),
  add constraint content_translations_pipeline_version_check
    check ((provider = 'google') = (pipeline_version is not null)),
  add constraint content_translations_entity_field_provider_key
    unique (entity_type, entity_id, field, language, provider);
