-- Phase 5: dashboard and progress (derived data only).
--
-- plant.md: every dashboard value is derived from lesson_progress and
-- exercise_attempts; nothing derived is stored. These views and the function
-- are SECURITY INVOKER, so the caller's RLS applies to every table they read:
-- a learner sees only their own rows, an admin everyone's (the backend always
-- filters on its own user id). Content counts only when it and every parent
-- are published; statuses are checked explicitly because admins can read
-- drafts.

-- Exercise results -------------------------------------------------------------

-- One row per user and attempted exercise. The best attempt (highest score,
-- then the latest) is the one that counts: its score and feedback.
create view public.v_user_exercise_results
with (security_invoker = true)
as
select distinct on (a.user_id, a.exercise_id)
  a.user_id,
  a.exercise_id,
  (count(*) over per_exercise)::int as attempt_count,
  a.score as best_score,
  first_value(a.score) over (
    partition by a.user_id, a.exercise_id
    order by a.attempted_at desc, a.id
  ) as last_score,
  max(a.attempted_at) over per_exercise as last_attempted_at,
  bool_or(a.is_correct) over per_exercise as passed,
  a.feedback as best_feedback
from public.exercise_attempts a
window per_exercise as (partition by a.user_id, a.exercise_id)
order by a.user_id, a.exercise_id, a.score desc, a.attempted_at desc, a.id;

-- Skill progress ---------------------------------------------------------------

-- One row per user and skill (every skill, also those without content).
-- Lessons: completed / started out of the published ones. Exercises: attempted
-- and passed out of the published ones; average of the best scores.
create view public.v_user_skill_progress
with (security_invoker = true)
as
with visible_lessons as (
  select l.id as lesson_id, c.skill_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.status = 'published'
    and m.status = 'published'
    and c.status = 'published'
),
visible_exercises as (
  select e.id as exercise_id, vl.skill_id
  from public.exercises e
  join visible_lessons vl on vl.lesson_id = e.lesson_id
  where e.status = 'published'
),
lesson_totals as (
  select skill_id, count(*)::int as total
  from visible_lessons
  group by skill_id
),
exercise_totals as (
  select skill_id, count(*)::int as total
  from visible_exercises
  group by skill_id
),
lesson_counts as (
  select
    lp.user_id,
    vl.skill_id,
    (count(*) filter (where lp.status = 'completed'))::int as completed,
    (count(*) filter (where lp.status <> 'not_started'))::int as started
  from public.lesson_progress lp
  join visible_lessons vl on vl.lesson_id = lp.lesson_id
  group by lp.user_id, vl.skill_id
),
exercise_counts as (
  select
    r.user_id,
    ve.skill_id,
    count(*)::int as attempted,
    (count(*) filter (where r.passed))::int as passed,
    round(avg(r.best_score))::int as average_score
  from public.v_user_exercise_results r
  join visible_exercises ve on ve.exercise_id = r.exercise_id
  group by r.user_id, ve.skill_id
)
select
  p.id as user_id,
  s.id as skill_id,
  s.code as skill_code,
  s.name as skill_name,
  s.order_index as skill_order,
  coalesce(lt.total, 0) as total_lessons,
  coalesce(lc.completed, 0) as completed_lessons,
  coalesce(lc.started, 0) as started_lessons,
  coalesce(et.total, 0) as total_exercises,
  coalesce(ec.attempted, 0) as attempted_exercises,
  coalesce(ec.passed, 0) as passed_exercises,
  ec.average_score
from public.profiles p
cross join public.skills s
left join lesson_totals lt on lt.skill_id = s.id
left join exercise_totals et on et.skill_id = s.id
left join lesson_counts lc on lc.user_id = p.id and lc.skill_id = s.id
left join exercise_counts ec on ec.user_id = p.id and ec.skill_id = s.id;

-- Activity -----------------------------------------------------------------------

-- Every learning event: a lesson started, completed or last visited, and every
-- attempt. `lesson_visited` is the latest visit only (lesson_progress keeps one
-- timestamp); it counts for the streak, not for the activity list. `visible`:
-- the content is still published, so its title may be shown.
create view public.v_user_activity
with (security_invoker = true)
as
select
  lp.user_id,
  'lesson_started'::text as kind,
  lp.started_at as occurred_at,
  lp.lesson_id,
  null::uuid as exercise_id,
  null::uuid as attempt_id,
  null::int as score,
  null::boolean as is_correct,
  public.is_lesson_published(lp.lesson_id) as visible
from public.lesson_progress lp
where lp.started_at is not null
union all
select
  lp.user_id,
  'lesson_completed',
  lp.completed_at,
  lp.lesson_id,
  null,
  null,
  null,
  null,
  public.is_lesson_published(lp.lesson_id)
from public.lesson_progress lp
where lp.completed_at is not null
union all
select
  lp.user_id,
  'lesson_visited',
  lp.last_accessed_at,
  lp.lesson_id,
  null,
  null,
  null,
  null,
  public.is_lesson_published(lp.lesson_id)
from public.lesson_progress lp
union all
select
  a.user_id,
  'exercise_attempted',
  a.attempted_at,
  e.lesson_id,
  a.exercise_id,
  a.id,
  a.score,
  a.is_correct,
  public.is_exercise_published(a.exercise_id)
from public.exercise_attempts a
-- Left join: an exercise the caller can no longer read still counts as a day
-- of study (streak), without a lesson.
left join public.exercises e on e.id = a.exercise_id;

-- Days with any activity for the caller, in their time zone, newest first. One
-- row per day, so the streak never hits the API row limit. An unknown time
-- zone raises 22023 (the backend validates it first).
create function public.activity_days(p_time_zone text)
returns setof date
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct (a.occurred_at at time zone p_time_zone)::date as day
  from public.v_user_activity a
  where a.user_id = auth.uid()
  order by day desc;
$$;

-- Privileges ---------------------------------------------------------------------

revoke all on public.v_user_exercise_results, public.v_user_skill_progress,
  public.v_user_activity from anon, authenticated;
grant select on public.v_user_exercise_results, public.v_user_skill_progress,
  public.v_user_activity to authenticated;

revoke execute on function public.activity_days(text) from public, anon;
grant execute on function public.activity_days(text) to authenticated;
