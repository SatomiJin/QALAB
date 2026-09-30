import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { serviceClient, TestUsers } from './support.js';

/**
 * Admin CMS writes, tested directly against the database as signed-in users
 * (JWT + public anon key): write policies (`is_admin()`), column grants,
 * audit trigger, `restrict` foreign keys, unique slugs, `reorder_content`
 * and `content_usage`. Everything created here is removed afterwards.
 */
describe('admin CMS RLS (integration)', () => {
  const users = new TestUsers();
  const service = serviceClient();
  const tag = randomBytes(4).toString('hex');
  const courseIds: string[] = [];

  let learner: { id: string; email: string };
  let adminUser: { id: string; email: string };
  let asLearner: SupabaseClient;
  let asAdmin: SupabaseClient;
  let skillId: string;

  async function insertAs<T = { id: string }>(
    client: SupabaseClient,
    table: string,
    row: Record<string, unknown>,
    columns = 'id',
  ): Promise<T> {
    const { data, error } = await client
      .from(table)
      .insert(row)
      .select(columns)
      .single<T>();
    if (error) throw error;
    return data;
  }

  /** A published course → module → lesson → exercise (+ key), as the admin. */
  async function tree(label: string) {
    const course = await insertAs(asAdmin, 'courses', {
      skill_id: skillId,
      title: `IT admin ${label}`,
      slug: `qalab-it-admin-${label}-${tag}`,
      status: 'published',
    });
    courseIds.push(course.id);
    const module = await insertAs(asAdmin, 'modules', {
      course_id: course.id,
      title: 'IT module',
      status: 'published',
    });
    const lesson = await insertAs(asAdmin, 'lessons', {
      module_id: module.id,
      title: 'IT lesson',
      slug: 'it-lesson',
      status: 'published',
    });
    const exercise = await insertAs(asAdmin, 'exercises', {
      lesson_id: lesson.id,
      type: 'multiple_choice',
      question: 'IT question',
      prompt_data: {
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
      status: 'published',
    });
    const { error } = await asAdmin.from('exercise_answers').insert({
      exercise_id: exercise.id,
      answer_data: { correct: ['b'] },
      explanation: 'IT explanation',
    });
    if (error) throw error;
    return { course, module, lesson, exercise };
  }

  beforeAll(async () => {
    learner = await users.create('admin-learner');
    adminUser = await users.create('admin-admin');
    await users.setRole(adminUser.id, 'admin');
    [asLearner, asAdmin] = await Promise.all([
      users.signIn(learner.email),
      users.signIn(adminUser.email),
    ]);
    const { data } = await service
      .from('skills')
      .select('id')
      .eq('code', 'fundamentals')
      .single<{ id: string }>();
    skillId = data!.id;
  });

  afterAll(async () => {
    // Users first: their progress and attempts cascade away.
    await users.cleanup();
    if (courseIds.length) {
      await service.from('courses').delete().in('id', courseIds);
    }
  });

  describe('admins', () => {
    it('create, update and delete content; audit columns come from the JWT', async () => {
      const { course, lesson } = await tree('crud');
      const { data: row } = await service
        .from('courses')
        .select('created_by, updated_by')
        .eq('id', course.id)
        .single();
      expect(row).toEqual({
        created_by: adminUser.id,
        updated_by: adminUser.id,
      });

      const updated = await asAdmin
        .from('lessons')
        .update({ title: 'Renamed', content_md: '# New' })
        .eq('id', lesson.id)
        .select('title, updated_by');
      expect(updated.error).toBeNull();
      expect(updated.data).toEqual([
        { title: 'Renamed', updated_by: adminUser.id },
      ]);

      const removed = await asAdmin
        .from('courses')
        .delete()
        .eq('id', course.id)
        .select('id');
      expect(removed.error).toBeNull();
      expect(removed.data).toHaveLength(1);
      const { data: gone } = await service
        .from('lessons')
        .select('id')
        .eq('id', lesson.id);
      expect(gone).toEqual([]); // cascaded
    });

    it('read and write answer keys', async () => {
      const { exercise } = await tree('keys');
      const saved = await asAdmin
        .from('exercise_answers')
        .upsert(
          {
            exercise_id: exercise.id,
            answer_data: { correct: ['a'] },
            explanation: 'x',
          },
          { onConflict: 'exercise_id' },
        )
        .select('answer_data');
      expect(saved.error).toBeNull();
      expect(saved.data).toEqual([{ answer_data: { correct: ['a'] } }]);
    });

    it('cannot set audit columns, ids, parents or an exercise type', async () => {
      const { lesson, exercise, module } = await tree('columns');
      const forged = await asAdmin.from('courses').insert({
        skill_id: skillId,
        title: 'Forged',
        slug: `qalab-it-forged-${tag}`,
        created_by: learner.id,
      });
      expect(forged.error?.code).toBe('42501');

      for (const [table, patch, id] of [
        ['lessons', { module_id: module.id }, lesson.id],
        ['exercises', { type: 'scenario' }, exercise.id],
        ['exercises', { lesson_id: lesson.id }, exercise.id],
        ['lessons', { updated_by: learner.id }, lesson.id],
        ['lessons', { created_at: '2000-01-01T00:00:00Z' }, lesson.id],
      ] as const) {
        const { error } = await asAdmin.from(table).update(patch).eq('id', id);
        expect(error?.code).toBe('42501');
      }
    });

    it('get 23505 for a used slug and 23503 when learner data exists', async () => {
      const { course, lesson, exercise } = await tree('rules');
      const clash = await asAdmin.from('courses').insert({
        skill_id: skillId,
        title: 'Clash',
        slug: `qalab-it-admin-rules-${tag}`,
      });
      expect(clash.error?.code).toBe('23505');

      const { error: progressError } = await asLearner
        .from('lesson_progress')
        .insert({
          user_id: learner.id,
          lesson_id: lesson.id,
          status: 'in_progress',
        });
      expect(progressError).toBeNull();

      const usage = await asAdmin.rpc('content_usage', {
        p_lesson_ids: [lesson.id],
        p_exercise_ids: [exercise.id],
      });
      expect(usage.error).toBeNull();
      expect(usage.data).toEqual([{ kind: 'lesson', id: lesson.id }]);

      for (const [table, id] of [
        ['lessons', lesson.id],
        ['courses', course.id],
      ] as const) {
        const { error } = await asAdmin.from(table).delete().eq('id', id);
        expect(error?.code).toBe('23503');
      }
      const archived = await asAdmin
        .from('lessons')
        .update({ status: 'archived' })
        .eq('id', lesson.id)
        .select('status');
      expect(archived.data).toEqual([{ status: 'archived' }]);
    });

    it('reorder children of one parent in one call', async () => {
      const { module, lesson } = await tree('reorder');
      const second = await insertAs(asAdmin, 'lessons', {
        module_id: module.id,
        title: 'Second',
        slug: 'second',
      });
      const ok = await asAdmin.rpc('reorder_content', {
        p_kind: 'lesson',
        p_parent_id: module.id,
        p_ids: [second.id, lesson.id],
      });
      expect(ok.error).toBeNull();
      expect(ok.data).toBe(2);
      const { data } = await asAdmin
        .from('lessons')
        .select('id, order_index')
        .eq('module_id', module.id)
        .order('order_index');
      expect(data).toEqual([
        { id: second.id, order_index: 1 },
        { id: lesson.id, order_index: 2 },
      ]);

      const foreign = await asAdmin.rpc('reorder_content', {
        p_kind: 'lesson',
        p_parent_id: module.id,
        p_ids: [second.id, module.id],
      });
      expect(foreign.error?.code).toBe('22023');
    });
  });

  describe('learners', () => {
    it('cannot insert, update or delete any content', async () => {
      const { course, module, lesson, exercise } = await tree('learner');
      const inserts = await Promise.all([
        asLearner
          .from('courses')
          .insert({ skill_id: skillId, title: 'x', slug: `x-${tag}` }),
        asLearner.from('modules').insert({ course_id: course.id, title: 'x' }),
        asLearner
          .from('lessons')
          .insert({ module_id: module.id, title: 'x', slug: 'x' }),
        asLearner
          .from('exercises')
          .insert({ lesson_id: lesson.id, type: 'scenario', question: 'x' }),
      ]);
      for (const { error } of inserts) expect(error?.code).toBe('42501');

      for (const [table, id] of [
        ['courses', course.id],
        ['modules', module.id],
        ['lessons', lesson.id],
        ['exercises', exercise.id],
      ] as const) {
        const update = await asLearner
          .from(table)
          .update({ status: 'draft' })
          .eq('id', id)
          .select('id');
        expect(update.data).toEqual([]);
        const remove = await asLearner
          .from(table)
          .delete()
          .eq('id', id)
          .select('id');
        expect(remove.data).toEqual([]);
      }
      const { data } = await service
        .from('courses')
        .select('status')
        .eq('id', course.id)
        .single();
      expect(data).toEqual({ status: 'published' });
    });

    it('do not see drafts an admin creates', async () => {
      const { module } = await tree('drafts');
      const draft = await insertAs(asAdmin, 'lessons', {
        module_id: module.id,
        title: 'Draft',
        slug: 'draft',
      });
      const { data } = await asLearner
        .from('lessons')
        .select('id')
        .eq('id', draft.id);
      expect(data).toEqual([]);
      const { data: forAdmin } = await asAdmin
        .from('lessons')
        .select('id')
        .eq('id', draft.id);
      expect(forAdmin).toHaveLength(1);
    });

    it('cannot reorder, and see only their own usage', async () => {
      const { module, lesson } = await tree('learner-rpc');
      const reorder = await asLearner.rpc('reorder_content', {
        p_kind: 'lesson',
        p_parent_id: module.id,
        p_ids: [lesson.id],
      });
      expect(reorder.error?.code).toBe('22023');

      const usage = await asLearner.rpc('content_usage', {
        p_lesson_ids: [lesson.id],
        p_exercise_ids: [],
      });
      expect(usage.data).toEqual([]);
    });
  });
});
