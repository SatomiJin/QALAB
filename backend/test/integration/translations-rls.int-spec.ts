import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import { sourceHash } from '../../src/translation/content-translation.service.js';
import { anonClient, serviceClient, TestUsers } from './support.js';

/**
 * RLS on `content_translations`: learners read translations only of content
 * they can see and write nothing, admins write manual rows only (machine rows
 * are the service role's), and deleting content removes its translations.
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

  it('does not let learners write translations', async () => {
    const insertRes = await asLearner
      .from('content_translations')
      .insert({ ...translation(publishedLesson), field: 'content_md' });
    expect(insertRes.error?.code).toBe('42501');

    // Update / delete are granted (for admins); the policies match no row.
    const updateRes = await asLearner
      .from('content_translations')
      .update({ text: '<script>x</script>' })
      .eq('entity_id', publishedLesson)
      .select('id');
    expect(updateRes.error).toBeNull();
    expect(updateRes.data).toEqual([]);

    const deleteRes = await asLearner
      .from('content_translations')
      .delete()
      .eq('entity_id', publishedLesson)
      .select('id');
    expect(deleteRes.error).toBeNull();
    expect(deleteRes.data).toEqual([]);
  });

  it('lets admins write manual translations only (Admin CMS)', async () => {
    const machine = {
      ...translation(publishedLesson),
      field: 'content_md',
      provider: 'google',
      pipeline_version: 1,
      text: 'Máy dịch',
    };
    const seeded = await admin.from('content_translations').insert(machine);
    expect(seeded.error).toBeNull();

    // Insert and upsert a manual row, the way the backend saves.
    const manual = { ...translation(publishedLesson), field: 'content_md' };
    const insertRes = await asAdmin.from('content_translations').insert(manual);
    expect(insertRes.error).toBeNull();
    const upsertRes = await asAdmin
      .from('content_translations')
      .upsert(
        { ...manual, text: 'Đã sửa' },
        { onConflict: 'entity_type,entity_id,field,language,provider' },
      )
      .select('text');
    expect(upsertRes.error).toBeNull();
    expect(upsertRes.data).toEqual([{ text: 'Đã sửa' }]);

    // Machine rows: no insert, no update, no delete, no turning manual into one.
    const machineInsert = await asAdmin
      .from('content_translations')
      .insert({ ...machine, field: 'description' });
    expect(machineInsert.error?.code).toBe('42501');
    const machineUpdate = await asAdmin
      .from('content_translations')
      .update({ text: 'x' })
      .eq('entity_id', publishedLesson)
      .eq('provider', 'google')
      .select('id');
    expect(machineUpdate.data).toEqual([]);
    const machineDelete = await asAdmin
      .from('content_translations')
      .delete()
      .eq('entity_id', publishedLesson)
      .eq('provider', 'google')
      .select('id');
    expect(machineDelete.data).toEqual([]);
    const toMachine = await asAdmin
      .from('content_translations')
      .update({ provider: 'google' })
      .eq('entity_id', publishedLesson)
      .eq('field', 'content_md')
      .eq('provider', 'manual');
    expect(toMachine.error?.code).toBe('42501');

    // Server-set columns are not granted.
    const withId = await asAdmin
      .from('content_translations')
      .insert({ ...manual, field: 'description', id: randomUUID() });
    expect(withId.error?.code).toBe('42501');

    const deleteRes = await asAdmin
      .from('content_translations')
      .delete()
      .eq('entity_id', publishedLesson)
      .eq('field', 'content_md')
      .eq('provider', 'manual')
      .select('id');
    expect(deleteRes.data).toHaveLength(1);

    // Clean up the machine row for the next tests.
    const cleanup = await admin
      .from('content_translations')
      .delete()
      .eq('entity_id', publishedLesson)
      .eq('field', 'content_md');
    if (cleanup.error) throw cleanup.error;
  });

  it('gives anonymous clients nothing', async () => {
    const { data, error } = await anonClient()
      .from('content_translations')
      .select('id');
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  });

  it('seed: manual translations match the backend source hash', async () => {
    // Seeded translations (SQL seed, then `npm run seed:curriculum`) must hash
    // the stored English exactly as the backend does, or the Vietnamese
    // lessons would be treated as stale.
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
