import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { anonClient, serviceClient, TestUsers } from './support.js';

/**
 * The dashboard views and `activity_days()` are security invoker: tested as
 * signed-in users that RLS limits them to the caller's own rows (all rows for
 * an admin, so the backend must filter) and to published content. Content is
 * created in the `automation` skill with the service role and removed after.
 */
describe('dashboard views (integration)', () => {
  const users = new TestUsers();
  const admin = serviceClient();
  const tag = randomBytes(4).toString('hex');
  let courseId: string;
  let skillId: string;
  let baseline: { lessons: number; exercises: number };

  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let asAlice: SupabaseClient;
  let asBob: SupabaseClient;
  let asAdmin: SupabaseClient;

  const ids = {} as Record<
    'lesson' | 'draftLesson' | 'exercise' | 'draftExercise' | 'hiddenExercise',
    string
  >;

  async function insert(table: string, row: Record<string, unknown>) {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }

  const exercise = (lesson_id: string, status: string) =>
    insert('exercises', {
      lesson_id,
      type: 'multiple_choice',
      question: `IT dashboard ${tag}`,
      prompt_data: { options: [{ id: 'a', text: 'A' }] },
      status,
    });

  const attempt = (
    user_id: string,
    exercise_id: string,
    score: number,
    attempted_at: string,
  ) =>
    insert('exercise_attempts', {
      user_id,
      exercise_id,
      answer: { selected: ['a'] },
      score,
      is_correct: score === 100,
      feedback: { type: 'multiple_choice', options: [] },
      attempted_at,
    });

  async function automationRow(client: SupabaseClient, userId: string) {
    const { data, error } = await client
      .from('v_user_skill_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  beforeAll(async () => {
    alice = await users.create('dashboard-alice');
    bob = await users.create('dashboard-bob');
    const carol = await users.create('dashboard-admin');
    await users.setRole(carol.id, 'admin');
    [asAlice, asBob, asAdmin] = await Promise.all([
      users.signIn(alice.email),
      users.signIn(bob.email),
      users.signIn(carol.email),
    ]);

    const { data: skill } = await admin
      .from('skills')
      .select('id')
      .eq('code', 'automation')
      .single<{ id: string }>();
    skillId = skill!.id;
    const before = await automationRow(asAlice, alice.id);
    baseline = {
      lessons: before!.total_lessons,
      exercises: before!.total_exercises,
    };

    courseId = await insert('courses', {
      skill_id: skillId,
      title: 'IT dashboard',
      slug: `qalab-it-dashboard-${tag}`,
      status: 'published',
    });
    const moduleId = await insert('modules', {
      course_id: courseId,
      title: 'IT module',
      status: 'published',
    });
    const lesson = (slug: string, status: string) =>
      insert('lessons', { module_id: moduleId, slug, title: slug, status });
    ids.lesson = await lesson('visible', 'published');
    ids.draftLesson = await lesson('draft', 'draft');
    ids.exercise = await exercise(ids.lesson, 'published');
    ids.draftExercise = await exercise(ids.lesson, 'draft');
    ids.hiddenExercise = await exercise(ids.draftLesson, 'published');

    const now = Date.now();
    const at = (minutesAgo: number) =>
      new Date(now - minutesAgo * 60_000).toISOString();
    const { error } = await admin.from('lesson_progress').insert(
      [ids.lesson, ids.draftLesson].map((lesson_id) => ({
        user_id: alice.id,
        lesson_id,
        status: 'completed',
        progress_percent: 100,
        started_at: at(30),
        completed_at: at(20),
        last_accessed_at: at(20),
      })),
    );
    if (error) throw error;
    await attempt(alice.id, ids.exercise, 100, at(10));
    await attempt(alice.id, ids.exercise, 0, at(5));
    await attempt(alice.id, ids.draftExercise, 0, at(4));
    await attempt(alice.id, ids.hiddenExercise, 0, at(3));
  });

  afterAll(async () => {
    // Users first: progress and attempts cascade away, then content can go.
    await users.cleanup();
    if (courseId) {
      // A failed delete would leave a published test course for real users.
      const { error } = await admin.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    }
  });

  describe('v_user_skill_progress', () => {
    it('gives the caller one row per skill, their own only', async () => {
      const { data, error } = await asAlice
        .from('v_user_skill_progress')
        .select('user_id, skill_code');
      expect(error).toBeNull();
      expect(data).toHaveLength(7);
      expect(new Set(data!.map((row) => row.user_id))).toEqual(
        new Set([alice.id]),
      );
    });

    it('counts published content only, with the best score', async () => {
      expect(await automationRow(asAlice, alice.id)).toMatchObject({
        total_lessons: baseline.lessons + 1,
        completed_lessons: 1,
        started_lessons: 1,
        total_exercises: baseline.exercises + 1,
        attempted_exercises: 1,
        passed_exercises: 1,
        average_score: 100,
      });
    });

    it('hides other learners’ rows; an admin sees them', async () => {
      expect(await automationRow(asBob, alice.id)).toBeNull();
      expect(await automationRow(asBob, bob.id)).toMatchObject({
        completed_lessons: 0,
        attempted_exercises: 0,
        average_score: null,
      });
      expect(await automationRow(asAdmin, alice.id)).toMatchObject({
        completed_lessons: 1,
      });
    });

    it('is not readable without a session', async () => {
      const { data, error } = await anonClient()
        .from('v_user_skill_progress')
        .select('user_id');
      expect(data ?? []).toEqual([]);
      expect(error?.code).toBe('42501');
    });
  });

  describe('v_user_exercise_results', () => {
    it('keeps the best attempt and the latest score', async () => {
      const { data, error } = await asAlice
        .from('v_user_exercise_results')
        .select('*')
        .eq('exercise_id', ids.exercise);
      expect(error).toBeNull();
      expect(data).toEqual([
        expect.objectContaining({
          user_id: alice.id,
          attempt_count: 2,
          best_score: 100,
          last_score: 0,
          passed: true,
        }),
      ]);
    });

    it('hides other learners’ results', async () => {
      const { data } = await asBob
        .from('v_user_exercise_results')
        .select('exercise_id')
        .eq('user_id', alice.id);
      expect(data).toEqual([]);
    });
  });

  describe('v_user_activity', () => {
    it('lists every event, marking content that is not published', async () => {
      const { data, error } = await asAlice
        .from('v_user_activity')
        .select('kind, lesson_id, exercise_id, visible')
        .eq('user_id', alice.id);
      expect(error).toBeNull();
      const count = (kind: string, visible: boolean) =>
        data!.filter((row) => row.kind === kind && row.visible === visible)
          .length;
      expect(count('lesson_started', true)).toBe(1);
      expect(count('lesson_completed', true)).toBe(1);
      expect(count('lesson_visited', true)).toBe(1);
      expect(count('lesson_started', false)).toBe(1); // draft lesson
      expect(count('exercise_attempted', true)).toBe(2);
      expect(count('exercise_attempted', false)).toBe(2); // draft, hidden
    });

    it('hides other learners’ events', async () => {
      const { data } = await asBob
        .from('v_user_activity')
        .select('kind')
        .eq('user_id', alice.id);
      expect(data).toEqual([]);
    });
  });

  describe('activity_days()', () => {
    const today = (timeZone: string) =>
      new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

    it('returns the caller’s study days in their time zone', async () => {
      // Activity was 3–30 minutes ago: today, or yesterday right after midnight.
      const { data, error } = await asAlice.rpc('activity_days', {
        p_time_zone: 'Asia/Ho_Chi_Minh',
      });
      expect(error).toBeNull();
      expect(data!.length).toBeLessThanOrEqual(2);
      expect(data![0]).toBe(today('Asia/Ho_Chi_Minh'));
    });

    it('is empty for a learner without activity', async () => {
      const { data, error } = await asBob.rpc('activity_days', {
        p_time_zone: 'UTC',
      });
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('rejects an unknown time zone', async () => {
      const { error } = await asAlice.rpc('activity_days', {
        p_time_zone: 'Mars/Olympus',
      });
      expect(error?.code).toBe('22023');
    });
  });
});
