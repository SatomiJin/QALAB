import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { serviceClient, TestUsers } from './support.js';

/**
 * RLS, privileges and triggers on the practice tables, tested directly
 * against the database as signed-in users (JWT + public anon key). Content
 * is created with the service role and removed afterwards.
 */
describe('practice RLS (integration)', () => {
  const users = new TestUsers();
  const admin = serviceClient();
  const tag = randomBytes(4).toString('hex');
  let courseId: string;

  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let asAlice: SupabaseClient;
  let asBob: SupabaseClient;
  let asAdmin: SupabaseClient;

  const ids = {} as Record<
    'lesson' | 'draftLesson' | 'exercise' | 'draftExercise' | 'hiddenExercise',
    string
  >;
  let aliceAttempt: string;

  async function insert(table: string, row: Record<string, unknown>) {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }

  const prompt = {
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
  };

  async function exercise(lesson_id: string, status: string) {
    const id = await insert('exercises', {
      lesson_id,
      type: 'multiple_choice',
      question: `IT question ${tag}`,
      prompt_data: prompt,
      status,
    });
    const { error } = await admin.from('exercise_answers').insert({
      exercise_id: id,
      answer_data: { correct: ['b'] },
      explanation: 'IT explanation',
    });
    if (error) throw error;
    return id;
  }

  async function attempt(user_id: string, exercise_id: string) {
    return insert('exercise_attempts', {
      user_id,
      exercise_id,
      answer: { selected: ['a'] },
      score: 0,
      is_correct: false,
      feedback: { type: 'multiple_choice', options: [] },
    });
  }

  beforeAll(async () => {
    alice = await users.create('practice-alice');
    bob = await users.create('practice-bob');
    const carol = await users.create('practice-admin');
    await users.setRole(carol.id, 'admin');
    [asAlice, asBob, asAdmin] = await Promise.all([
      users.signIn(alice.email),
      users.signIn(bob.email),
      users.signIn(carol.email),
    ]);

    const { data: skill } = await admin
      .from('skills')
      .select('id')
      .eq('code', 'fundamentals')
      .single<{ id: string }>();
    courseId = await insert('courses', {
      skill_id: skill!.id,
      title: 'IT practice',
      slug: `qalab-it-practice-${tag}`,
      status: 'published',
    });
    const moduleId = await insert('modules', {
      course_id: courseId,
      title: 'IT module',
      status: 'published',
    });
    const lesson = (slug: string, status: string) =>
      insert('lessons', {
        module_id: moduleId,
        slug,
        title: slug,
        status,
      });
    ids.lesson = await lesson('visible', 'published');
    ids.draftLesson = await lesson('draft', 'draft');
    ids.exercise = await exercise(ids.lesson, 'published');
    ids.draftExercise = await exercise(ids.lesson, 'draft');
    ids.hiddenExercise = await exercise(ids.draftLesson, 'published');
    aliceAttempt = await attempt(alice.id, ids.exercise);
  });

  afterAll(async () => {
    // Users first: their attempts cascade away, then content can be deleted.
    await users.cleanup();
    if (courseId) await admin.from('courses').delete().eq('id', courseId);
  });

  describe('exercises', () => {
    it('learners read only published exercises in visible lessons', async () => {
      const { data, error } = await asAlice
        .from('exercises')
        .select('id')
        .in('id', Object.values(ids));
      expect(error).toBeNull();
      expect(data!.map((row) => row.id)).toEqual([ids.exercise]);
    });

    it('admins read all of them', async () => {
      const { data } = await asAdmin
        .from('exercises')
        .select('id')
        .in('id', [ids.exercise, ids.draftExercise, ids.hiddenExercise]);
      expect(data).toHaveLength(3);
    });

    it('learners cannot write exercises', async () => {
      const { error } = await asAlice.from('exercises').insert({
        lesson_id: ids.lesson,
        type: 'scenario',
        question: 'x',
      });
      expect(error?.code).toBe('42501');
      // Granted for admins; RLS leaves learners no row to update.
      const update = await asAlice
        .from('exercises')
        .update({ question: 'hacked' })
        .eq('id', ids.exercise)
        .select('id');
      expect(update.error).toBeNull();
      expect(update.data).toEqual([]);
    });
  });

  describe('exercise_answers', () => {
    it('learners cannot read any answer key', async () => {
      const { data, error } = await asAlice
        .from('exercise_answers')
        .select('exercise_id, answer_data, explanation');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('admins can read answer keys', async () => {
      const { data } = await asAdmin
        .from('exercise_answers')
        .select('exercise_id')
        .eq('exercise_id', ids.exercise);
      expect(data).toHaveLength(1);
    });

    it('learners cannot write answer keys', async () => {
      // No select policy for learners, so there is no row to update.
      const { data, error } = await asAlice
        .from('exercise_answers')
        .update({ answer_data: { correct: ['a'] } })
        .eq('exercise_id', ids.exercise)
        .select('exercise_id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const insert = await asAlice.from('exercise_answers').insert({
        exercise_id: ids.draftExercise,
        answer_data: { correct: ['a'] },
      });
      expect(insert.error?.code).toBe('42501');
    });
  });

  describe('exercise_attempts', () => {
    it('learners read only their own attempts; admins read all', async () => {
      const own = await asAlice.from('exercise_attempts').select('id');
      expect(own.data!.map((row) => row.id)).toEqual([aliceAttempt]);
      const other = await asBob.from('exercise_attempts').select('id');
      expect(other.data).toEqual([]);
      const all = await asAdmin
        .from('exercise_attempts')
        .select('id')
        .eq('id', aliceAttempt);
      expect(all.data).toHaveLength(1);
    });

    it('learners cannot insert attempts (scores come from the backend)', async () => {
      const { error } = await asAlice.from('exercise_attempts').insert({
        user_id: alice.id,
        exercise_id: ids.exercise,
        answer: { selected: ['b'] },
        score: 100,
        is_correct: true,
        feedback: { type: 'multiple_choice', options: [] },
      });
      expect(error?.code).toBe('42501');
    });

    it('learners cannot change a score or delete an attempt', async () => {
      const update = await asAlice
        .from('exercise_attempts')
        .update({ score: 100 })
        .eq('id', aliceAttempt);
      expect(update.error?.code).toBe('42501');
      const del = await asAlice
        .from('exercise_attempts')
        .delete()
        .eq('id', aliceAttempt);
      expect(del.error?.code).toBe('42501');
    });

    it("the self-assessment is written once, on the learner's own attempt", async () => {
      const byBob = await asBob
        .from('exercise_attempts')
        .update({ self_assessment: { checked: [] } })
        .eq('id', aliceAttempt)
        .select('id');
      expect(byBob.data ?? []).toEqual([]);

      const first = await asAlice
        .from('exercise_attempts')
        .update({ self_assessment: { checked: ['x'] } })
        .eq('id', aliceAttempt)
        .select('self_assessment, score')
        .single();
      expect(first.error).toBeNull();
      expect(first.data).toEqual({
        self_assessment: { checked: ['x'] },
        score: 0,
      });

      const second = await asAlice
        .from('exercise_attempts')
        .update({ self_assessment: { checked: [] } })
        .eq('id', aliceAttempt);
      expect(second.error?.code).toBe('23514');
    });

    it('even the service role cannot change a graded attempt', async () => {
      const fresh = await attempt(bob.id, ids.exercise);
      const { data, error } = await admin
        .from('exercise_attempts')
        .update({ score: 100, is_correct: true, user_id: alice.id })
        .eq('id', fresh)
        .select('score, is_correct, user_id')
        .single();
      expect(error).toBeNull();
      expect(data).toEqual({ score: 0, is_correct: false, user_id: bob.id });
    });

    it('content with attempts cannot be hard-deleted', async () => {
      const { error } = await admin
        .from('exercises')
        .delete()
        .eq('id', ids.exercise);
      expect(error?.code).toBe('23503');
    });
  });

  describe('content_translations for exercises', () => {
    const source = 'IT source';
    // No attempts at all (Bob attempted in the tests above).
    let asDave: SupabaseClient;

    beforeAll(async () => {
      const dave = await users.create('practice-dave');
      asDave = await users.signIn(dave.email);
      const rows = ['question', 'explanation', 'rubric.bva'].map((field) => ({
        entity_type: 'exercise',
        entity_id: ids.exercise,
        field,
        language: 'vi',
        source_hash: 'a'.repeat(64),
        text: `${field} ${source}`,
        provider: 'manual',
      }));
      rows.push({ ...rows[0], entity_id: ids.draftExercise });
      const { error } = await admin.from('content_translations').insert(rows);
      if (error) throw error;
    });

    afterAll(async () => {
      await admin
        .from('content_translations')
        .delete()
        .in('entity_id', [ids.exercise, ids.draftExercise]);
    });

    const fields = async (client: SupabaseClient) =>
      (
        (
          await client
            .from('content_translations')
            .select('field')
            .in('entity_id', [ids.exercise, ids.draftExercise])
        ).data ?? []
      )
        .map((row) => row.field as string)
        .sort();

    it('review texts are readable only after an attempt', async () => {
      expect(await fields(asDave)).toEqual(['question']);
      expect(await fields(asAlice)).toEqual([
        'explanation',
        'question',
        'rubric.bva',
      ]);
    });

    it('admins read all, including drafts', async () => {
      expect(await fields(asAdmin)).toHaveLength(4);
    });

    it('rejects unknown fields', async () => {
      const { error } = await admin.from('content_translations').insert({
        entity_type: 'exercise',
        entity_id: ids.exercise,
        field: 'answer_data',
        language: 'vi',
        source_hash: 'a'.repeat(64),
        text: 'x',
        provider: 'manual',
      });
      expect(error?.code).toBe('23514');
    });
  });
});
