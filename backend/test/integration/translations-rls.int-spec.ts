import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { sourceHash } from '../../src/translation/content-translation.service.js';
import { anonClient, serviceClient, TestUsers } from './support.js';

/**
 * RLS on `content_translations`: learners read translations only of content
 * they can see, nobody but the service role writes, and deleting content
 * removes its translations.
 */
describe('content_translations RLS (integration)', () => {
  const users = new TestUsers();
  const admin = serviceClient();
  const tag = randomBytes(4).toString('hex');
  const hash = 'a'.repeat(64);
  let courseId: string;
  let publishedLesson: string;
  let draftLesson: string;
  let asLearner: SupabaseClient;
  let asAdmin: SupabaseClient;

  async function insert(table: string, row: Record<string, unknown>) {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }

  const translation = (entity_id: string) => ({
    entity_type: 'lesson',
    entity_id,
    field: 'title',
    language: 'vi',
    source_hash: hash,
    text: 'Bản dịch',
    provider: 'manual',
  });

  beforeAll(async () => {
    const learner = await users.create('tr-learner');
    const boss = await users.create('tr-admin');
    await users.setRole(boss.id, 'admin');
    [asLearner, asAdmin] = await Promise.all([
      users.signIn(learner.email),
      users.signIn(boss.email),
    ]);

    const { data: skill } = await admin
      .from('skills')
      .select('id')
      .eq('code', 'fundamentals')
      .single<{ id: string }>();
    courseId = await insert('courses', {
      skill_id: skill!.id,
      title: 'IT translations',
      slug: `qalab-it-tr-${tag}`,
      status: 'published',
    });
    const moduleId = await insert('modules', {
      course_id: courseId,
      title: 'IT module',
      status: 'published',
    });
    publishedLesson = await insert('lessons', {
      module_id: moduleId,
      slug: 'published',
      title: 'Published',
      status: 'published',
    });
    draftLesson = await insert('lessons', {
      module_id: moduleId,
      slug: 'draft',
      title: 'Draft',
      status: 'draft',
    });
    const { error } = await admin
      .from('content_translations')
      .insert([translation(publishedLesson), translation(draftLesson)]);
    if (error) throw error;
  });

  afterAll(async () => {
    await users.cleanup();
    await admin.from('courses').delete().eq('id', courseId);
  });

  it('lets learners read translations of published content only', async () => {
    const { data, error } = await asLearner
      .from('content_translations')
      .select('entity_id')
      .in('entity_id', [publishedLesson, draftLesson]);
    expect(error).toBeNull();
    expect(data).toEqual([{ entity_id: publishedLesson }]);
  });

  it('lets admins read translations of drafts', async () => {
    const { data } = await asAdmin
      .from('content_translations')
      .select('entity_id')
      .in('entity_id', [publishedLesson, draftLesson]);
    expect((data ?? []).length).toBe(2);
  });

  it('does not let any API role write translations', async () => {
    for (const client of [asLearner, asAdmin]) {
      const insertRes = await client
        .from('content_translations')
        .insert({ ...translation(publishedLesson), field: 'content_md' });
      expect(insertRes.error?.code).toBe('42501');

      const updateRes = await client
        .from('content_translations')
        .update({ text: '<script>x</script>' })
        .eq('entity_id', publishedLesson);
      expect(updateRes.error?.code).toBe('42501');
    }
  });

  it('gives anonymous clients nothing', async () => {
    const { data, error } = await anonClient()
      .from('content_translations')
      .select('id');
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  });

  it('seed: manual translations match the backend source hash', async () => {
    // The seed hashes in SQL, the backend in Node: they must agree, or the
    // seeded Vietnamese lessons would be treated as stale.
    const lessonId = '6f1d2a4e-0c1b-4d7e-9a3f-000000001001';
    const { data: source } = await admin
      .from('lessons')
      .select('content_md')
      .eq('id', lessonId)
      .single<{ content_md: string }>();
    const { data: row } = await admin
      .from('content_translations')
      .select('source_hash')
      .eq('entity_id', lessonId)
      .eq('field', 'content_md')
      .eq('provider', 'manual')
      .single<{ source_hash: string }>();
    expect(row?.source_hash).toBe(sourceHash(source!.content_md));
  });

  it('keeps machine and manual translations apart', async () => {
    const { error } = await admin.from('content_translations').insert({
      ...translation(publishedLesson),
      provider: 'google',
      text: 'Máy dịch',
    });
    expect(error?.code).toBe('23514'); // machine rows need a pipeline_version

    const ok = await admin.from('content_translations').insert({
      ...translation(publishedLesson),
      provider: 'google',
      pipeline_version: 1,
      text: 'Máy dịch',
    });
    expect(ok.error).toBeNull();
  });

  it('removes translations when the content is deleted', async () => {
    await admin.from('lessons').delete().eq('id', draftLesson);
    const { data } = await admin
      .from('content_translations')
      .select('entity_id')
      .eq('entity_id', draftLesson);
    expect(data).toEqual([]);
  });
});
