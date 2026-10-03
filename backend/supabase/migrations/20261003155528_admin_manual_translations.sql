-- Manual translations written in the Admin CMS.
--
-- Until now only the service role wrote `content_translations` (curriculum
-- importer, machine-translation cache). Admins now write manual rows through
-- the backend, as themselves: RolesGuard checks the role, these policies
-- check it again with `is_admin()`. Machine rows (`google`) stay service-role
-- only, and learners still have no write privilege at all (a learner-written
-- translation would be shown to every learner).
--
-- The backend saves with one upsert, which sets every column of the payload
-- on conflict, so the update grant lists them all. Changing the identity
-- columns of a manual row is no more than an admin can do with a delete and
-- an insert; the policies keep every written row manual.

grant insert (entity_type, entity_id, field, language, provider, source_hash, text)
  on public.content_translations to authenticated;

grant update (entity_type, entity_id, field, language, provider, source_hash, text)
  on public.content_translations to authenticated;

grant delete on public.content_translations to authenticated;

create policy "content_translations: admins insert manual"
on public.content_translations
for insert
to authenticated
with check ((select public.is_admin()) and provider = 'manual');

create policy "content_translations: admins update manual"
on public.content_translations
for update
to authenticated
using ((select public.is_admin()) and provider = 'manual')
with check ((select public.is_admin()) and provider = 'manual');

create policy "content_translations: admins delete manual"
on public.content_translations
for delete
to authenticated
using ((select public.is_admin()) and provider = 'manual');
