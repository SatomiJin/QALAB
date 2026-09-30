import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { anonClient, serviceClient, TestUsers } from './support.js';

type Status = 'draft' | 'published' | 'archived';

/**
 * RLS and privileges on the learning tables, tested directly against the
 * database as a signed-in user (JWT + public anon key), not through the API.
 * Content is created with the service role and removed afterwards.
 */
describe('learning RLS (integration)', () => {
  const users = new TestUsers();
  const admin = serviceClient();
  const tag = randomBytes(4).toString('hex');
  const courseIds: string[] = [];

  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let asAlice: SupabaseClient;
  let asBob: SupabaseClient;
  let asAdmin: SupabaseClient;

  // published course: published module [published lesson, draft lesson],
  //                   draft module [published lesson]
  // draft course: published module [published lesson]
  const ids = {} as Record<
    | 'course'
    | 'draftCourse'
    | 'module'
    | 'draftModule'
    | 'moduleInDraftCourse'
    | 'lesson'
    | 'draftLesson'
    | 'lessonInDraftModule'
    | 'lessonInDraftCourse',
    string
  >;

  async function insert<T extends { id: string }>(
    table: string,
    row: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select('id')
      .single<T>();
    if (error) throw error;
    return data;
  }

  async function course(slug: string, status: Status) {
    const { data: skill } = await admin
      .from('skills')
      .select('id')
      .eq('code', 'fundamentals')
      .single<{ id: string }>();
    const row = await insert('courses', {
      skill_id: skill!.id,
      title: `IT ${slug}`,
      slug: `qalab-it-${slug}-${tag}`,
      status,
    });
    courseIds.push(row.id);
    return row.id;
  }

  const moduleRow = async (course_id: string, status: Status) =>
    (await insert('modules', { course_id, title: 'IT module', status })).id;

  const lessonRow = async (module_id: string, slug: string, status: Status) =>
    (
      await insert('lessons', {
        module_id,
        slug,
        title: `IT ${slug}`,
        content_md: '# IT',
        status,
      })
    ).id;

  const idsOf = (data: { id: string }[] | null) =>
    (data ?? []).map((row) => row.id).sort();

  beforeAll(async () => {
    alice = await users.create('learn-alice');
    bob = await users.create('learn-bob');
    const carol = await users.create('learn-admin');
    await users.setRole(carol.id, 'admin');
    [asAlice, asBob, asAdmin] = await Promise.all([
      users.signIn(alice.email),
      users.signIn(bob.email),
      users.signIn(carol.email),
    ]);

    ids.course = await course('published', 'published');
    ids.draftCourse = await course('draft', 'draft');
    ids.module = await moduleRow(ids.course, 'published');
    ids.draftModule = await moduleRow(ids.course, 'draft');
    ids.moduleInDraftCourse = await moduleRow(ids.draftCourse, 'published');
    ids.lesson = await lessonRow(ids.module, 'visible', 'published');
    ids.draftLesson = await lessonRow(ids.module, 'draft', 'draft');
    ids.lessonInDraftModule = await lessonRow(
      ids.draftModule,
      'in-draft-module',
      'published',
    );
    ids.lessonInDraftCourse = await lessonRow(
      ids.moduleInDraftCourse,
      'in-draft-course',
      'published',
    );
  });

  afterAll(async () => {
    // Users first: their progress cascades away, then content can be deleted.
    await users.cleanup();
    if (courseIds.length)
      await admin.from('courses').delete().in('id', courseIds);
  });

  describe('content', () => {
    it('lets learners read every skill', async () => {
      const { data, error } = await asAlice.from('skills').select('code');
      expect(error).toBeNull();
      expect((data ?? []).map((row) => row.code)).toEqual(
        expect.arrayContaining([
          'fundamentals',
          'testing_types',
          'test_design',
          'test_docs',
          'defect_mgmt',
          'api_testing',
          'automation',
        ]),
      );
    });

    it('shows learners only published courses', async () => {
      const { data } = await asAlice
        .from('courses')
        .select('id')
        .in('id', [ids.course, ids.draftCourse]);
      expect(idsOf(data)).toEqual([ids.course]);
    });

    it('shows learners only published modules of published courses', async () => {
      const { data } = await asAlice
        .from('modules')
        .select('id')
        .in('id', [ids.module, ids.draftModule, ids.moduleInDraftCourse]);
      expect(idsOf(data)).toEqual([ids.module]);
    });

    it('shows learners only lessons whose module and course are published', async () => {
      const { data } = await asAlice
        .from('lessons')
        .select('id')
        .in('id', [
          ids.lesson,
          ids.draftLesson,
          ids.lessonInDraftModule,
          ids.lessonInDraftCourse,
        ]);
      expect(idsOf(data)).toEqual([ids.lesson]);
    });

    it('lets admins read drafts', async () => {
      const { data } = await asAdmin
        .from('lessons')
        .select('id')
        .in('id', [ids.lesson, ids.draftLesson, ids.lessonInDraftCourse]);
      expect(idsOf(data)).toEqual(
        [ids.lesson, ids.draftLesson, ids.lessonInDraftCourse].sort(),
      );
    });

    it('gives anonymous clients nothing', async () => {
      const client = anonClient();
      for (const table of ['skills', 'courses', 'lessons', 'lesson_progress']) {
        const { data, error } = await client.from(table).select('id');
        // Privileges are revoked: permission denied, never rows.
        expect(error?.code).toBe('42501');
        expect(data).toBeNull();
      }
    });

    // Admin writes: admin-rls.int-spec.ts.
    it('does not let a learner write content', async () => {
      const insertRes = await asAlice
        .from('courses')
        .insert({ skill_id: ids.course, title: 'x', slug: `x-${tag}` });
      expect(insertRes.error?.code).toBe('42501');

      // Update/delete are granted (for admins) but RLS leaves learners no row.
      const updateRes = await asAlice
        .from('lessons')
        .update({ title: 'Hacked' })
        .eq('id', ids.lesson)
        .select('id');
      expect(updateRes.error).toBeNull();
      expect(updateRes.data).toEqual([]);

      const deleteRes = await asAlice
        .from('lessons')
        .delete()
        .eq('id', ids.lesson)
        .select('id');
      expect(deleteRes.error).toBeNull();
      expect(deleteRes.data).toEqual([]);
    });
  });

  describe('lesson_progress', () => {
    const base = () => ({
      user_id: alice.id,
      lesson_id: ids.lesson,
      status: 'in_progress',
      progress_percent: 40,
      last_accessed_at: new Date().toISOString(),
    });

    it('lets a learner record progress on a published lesson', async () => {
      const { data, error } = await asAlice
        .from('lesson_progress')
        .upsert(base(), { onConflict: 'user_id,lesson_id' })
        .select('status, progress_percent, started_at')
        .single();
      expect(error).toBeNull();
      expect(data).toMatchObject({
        status: 'in_progress',
        progress_percent: 40,
      });
      // The trigger fills in the start time.
      expect(data?.started_at).toEqual(expect.any(String));
    });

    it('never lets progress go backwards (trigger)', async () => {
      const lower = await asAlice
        .from('lesson_progress')
        .upsert(
          { ...base(), progress_percent: 10 },
          { onConflict: 'user_id,lesson_id' },
        )
        .select('progress_percent')
        .single();
      expect(lower.data?.progress_percent).toBe(40);

      await asAlice
        .from('lesson_progress')
        .update({ status: 'completed' })
        .eq('user_id', alice.id)
        .eq('lesson_id', ids.lesson);
      const reopened = await asAlice
        .from('lesson_progress')
        .update({ status: 'in_progress', progress_percent: 5 })
        .eq('user_id', alice.id)
        .eq('lesson_id', ids.lesson)
        .select('status, progress_percent, completed_at')
        .single();
      expect(reopened.data).toMatchObject({
        status: 'completed',
        progress_percent: 100,
        completed_at: expect.any(String),
      });
    });

    it('rejects progress on lessons learners cannot see', async () => {
      for (const lesson_id of [
        ids.draftLesson,
        ids.lessonInDraftModule,
        ids.lessonInDraftCourse,
      ]) {
        const { error } = await asAlice
          .from('lesson_progress')
          .insert({ ...base(), lesson_id });
        expect(error?.code).toBe('42501');
      }
    });

    it('rejects progress written for another user', async () => {
      const { error } = await asBob
        .from('lesson_progress')
        .insert({ ...base(), user_id: alice.id });
      expect(error?.code).toBe('42501');
    });

    it('hides and protects other users progress', async () => {
      const read = await asBob
        .from('lesson_progress')
        .select('id')
        .eq('user_id', alice.id);
      expect(read.data).toEqual([]);

      const update = await asBob
        .from('lesson_progress')
        .update({ progress_percent: 0 })
        .eq('user_id', alice.id)
        .select('id');
      expect(update.data).toEqual([]);
    });

    it('does not let a learner delete progress or change protected columns', async () => {
      const del = await asAlice
        .from('lesson_progress')
        .delete()
        .eq('user_id', alice.id);
      expect(del.error?.code).toBe('42501');

      const created = await asAlice
        .from('lesson_progress')
        .update({ created_at: '2000-01-01T00:00:00Z' })
        .eq('user_id', alice.id);
      expect(created.error?.code).toBe('42501');
    });

    it('lets admins read everyone progress', async () => {
      const { data } = await asAdmin
        .from('lesson_progress')
        .select('user_id')
        .eq('user_id', alice.id);
      expect(data).toEqual([{ user_id: alice.id }]);
    });

    it('blocks hard-deleting a lesson that has progress', async () => {
      const { error } = await admin
        .from('lessons')
        .delete()
        .eq('id', ids.lesson);
      expect(error?.code).toBe('23503');
    });
  });
});
