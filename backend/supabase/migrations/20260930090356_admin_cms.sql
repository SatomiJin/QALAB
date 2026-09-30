-- Phase 4: Admin CMS. Admins write content (courses, modules, lessons,
-- exercises and answer keys) through the backend as themselves, so RLS
-- (`is_admin()`) is the second check after the backend's RolesGuard.

-- Audit columns --------------------------------------------------------------
-- `created_by` / `updated_by` come from the JWT (`auth.uid()`), never from
-- the client: API roles have no privilege on these columns. Writes without a
-- user (seed, service role) keep the values they give.

create function public.set_content_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by, new.created_by);
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

create trigger courses_set_audit
before insert or update on public.courses
for each row execute function public.set_content_audit();

create trigger modules_set_audit
before insert or update on public.modules
for each row execute function public.set_content_audit();

create trigger lessons_set_audit
before insert or update on public.lessons
for each row execute function public.set_content_audit();

create trigger exercises_set_audit
before insert or update on public.exercises
for each row execute function public.set_content_audit();

-- Write policies (admins only) ----------------------------------------------

create policy "courses: admins insert"
on public.courses for insert to authenticated
with check ((select public.is_admin()));

create policy "courses: admins update"
on public.courses for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "courses: admins delete"
on public.courses for delete to authenticated
using ((select public.is_admin()));

create policy "modules: admins insert"
on public.modules for insert to authenticated
with check ((select public.is_admin()));

create policy "modules: admins update"
on public.modules for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "modules: admins delete"
on public.modules for delete to authenticated
using ((select public.is_admin()));

create policy "lessons: admins insert"
on public.lessons for insert to authenticated
with check ((select public.is_admin()));

create policy "lessons: admins update"
on public.lessons for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "lessons: admins delete"
on public.lessons for delete to authenticated
using ((select public.is_admin()));

create policy "exercises: admins insert"
on public.exercises for insert to authenticated
with check ((select public.is_admin()));

create policy "exercises: admins update"
on public.exercises for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "exercises: admins delete"
on public.exercises for delete to authenticated
using ((select public.is_admin()));

create policy "exercise_answers: admins insert"
on public.exercise_answers for insert to authenticated
with check ((select public.is_admin()));

create policy "exercise_answers: admins update"
on public.exercise_answers for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Privileges ----------------------------------------------------------------
-- Only editable columns are granted. Not writable by any API role: ids,
-- audit columns, timestamps. Not updatable: the parent of a module, lesson or
-- exercise (content does not move between parents) and an exercise's type
-- (answers and attempts depend on it). Answer keys are removed only with
-- their exercise (cascade). Hard deletes of content with learner progress or
-- attempts fail on the `restrict` foreign keys (23503).

grant insert (skill_id, title, slug, description, status, order_index)
  on public.courses to authenticated;
grant update (skill_id, title, slug, description, status, order_index)
  on public.courses to authenticated;
grant delete on public.courses to authenticated;

grant insert (course_id, title, description, status, order_index)
  on public.modules to authenticated;
grant update (title, description, status, order_index)
  on public.modules to authenticated;
grant delete on public.modules to authenticated;

grant insert (module_id, title, slug, content_md, estimated_minutes, status,
  order_index)
  on public.lessons to authenticated;
grant update (title, slug, content_md, estimated_minutes, status, order_index)
  on public.lessons to authenticated;
grant delete on public.lessons to authenticated;

grant insert (lesson_id, type, question, prompt_data, difficulty, status,
  order_index)
  on public.exercises to authenticated;
grant update (question, prompt_data, difficulty, status, order_index)
  on public.exercises to authenticated;
grant delete on public.exercises to authenticated;

-- `exercise_id` is in the update grant only because an upsert sets every
-- column it inserts; the primary key cannot change anything else.
grant insert (exercise_id, answer_data, explanation)
  on public.exercise_answers to authenticated;
grant update (exercise_id, answer_data, explanation)
  on public.exercise_answers to authenticated;

-- Reordering ----------------------------------------------------------------
-- Sets `order_index` = position in `p_ids` for the children of one parent, in
-- one statement (all or nothing). Security invoker: RLS decides who may
-- update. Raises 22023 unless every id is a child of the parent and was
-- updated, so a non-admin (who updates nothing) gets an error, not a no-op.
-- Parents: courses → skill, modules → course, lessons → module,
-- exercises → lesson.

create function public.reorder_content(
  p_kind text,
  p_parent_id uuid,
  p_ids uuid[]
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  updated integer;
begin
  if p_ids is null or cardinality(p_ids) = 0
    or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) then
    raise exception 'ids must be a non-empty list without duplicates'
      using errcode = '22023';
  end if;

  case p_kind
    when 'course' then
      update public.courses t set order_index = o.pos
      from unnest(p_ids) with ordinality as o(id, pos)
      where t.id = o.id and t.skill_id = p_parent_id;
    when 'module' then
      update public.modules t set order_index = o.pos
      from unnest(p_ids) with ordinality as o(id, pos)
      where t.id = o.id and t.course_id = p_parent_id;
    when 'lesson' then
      update public.lessons t set order_index = o.pos
      from unnest(p_ids) with ordinality as o(id, pos)
      where t.id = o.id and t.module_id = p_parent_id;
    when 'exercise' then
      update public.exercises t set order_index = o.pos
      from unnest(p_ids) with ordinality as o(id, pos)
      where t.id = o.id and t.lesson_id = p_parent_id;
    else
      raise exception 'unknown content kind %', p_kind using errcode = '22023';
  end case;

  get diagnostics updated = row_count;
  if updated <> cardinality(p_ids) then
    raise exception 'every id must be a child of the parent'
      using errcode = '22023';
  end if;
  return updated;
end;
$$;

revoke execute on function public.reorder_content(text, uuid, uuid[])
  from public, anon;
grant execute on function public.reorder_content(text, uuid, uuid[])
  to authenticated;

-- Usage ---------------------------------------------------------------------
-- Which of the given lessons have learner progress and which exercises have
-- attempts: such content can be archived but not hard-deleted. Security
-- invoker: admins read every progress row and attempt (RLS); anyone else
-- would only see their own.

create function public.content_usage(
  p_lesson_ids uuid[],
  p_exercise_ids uuid[]
)
returns table (kind text, id uuid)
language sql
stable
set search_path = ''
as $$
  select distinct 'lesson', p.lesson_id
  from public.lesson_progress p
  where p.lesson_id = any (p_lesson_ids)
  union
  select distinct 'exercise', a.exercise_id
  from public.exercise_attempts a
  where a.exercise_id = any (p_exercise_ids);
$$;

revoke execute on function public.content_usage(uuid[], uuid[])
  from public, anon;
grant execute on function public.content_usage(uuid[], uuid[])
  to authenticated;
