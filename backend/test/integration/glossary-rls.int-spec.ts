import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { serviceClient, TestUsers } from './support.js';

/**
 * `glossary_terms` against the real database as signed-in users: learners
 * read published rows only and write nothing; admins write through the
 * policies and column grants; audit columns, the phrase rules (check +
 * unique trigger) and the related-ids cleanup. Terms made here are removed
 * afterwards (slugs `qalab-it-…`).
 */
describe('glossary RLS (integration)', () => {
  const users = new TestUsers();
  const service = serviceClient();
  const tag = randomBytes(4).toString('hex');
  const ids: string[] = [];

  let adminId: string;
  let asLearner: SupabaseClient;
  let asAdmin: SupabaseClient;

  const row = (label: string, over: Record<string, unknown> = {}) => ({
    slug: `qalab-it-${label}-${tag}`,
    term: `IT ${label} ${tag}`,
    skill_code: 'fundamentals',
    match_phrases: [`it ${label} ${tag}`],
    definition_en: 'English.',
    definition_vi: 'Tiếng Việt.',
    ...over,
  });

  async function insertAs(
    client: SupabaseClient,
    values: Record<string, unknown>,
  ) {
    const result = await client
      .from('glossary_terms')
      .insert(values)
      .select('id, status, created_by, updated_by, related_ids')
      .single<{
        id: string;
        status: string;
        created_by: string | null;
        updated_by: string | null;
        related_ids: string[];
      }>();
    if (result.data) ids.push(result.data.id);
    return result;
  }

  beforeAll(async () => {
    const learner = await users.create('glossary-learner');
    const admin = await users.create('glossary-admin');
    adminId = admin.id;
    await users.setRole(admin.id, 'admin');
    asLearner = await users.signIn(learner.email);
    asAdmin = await users.signIn(admin.email);
  });

  afterAll(async () => {
    if (ids.length > 0) {
      const { error } = await service
        .from('glossary_terms')
        .delete()
        .in('id', ids);
      if (error) throw error;
    }
    await users.cleanup();
  });

  it('admins insert (draft by default) with audit columns from the JWT', async () => {
    const { data, error } = await insertAs(asAdmin, row('audit'));
    expect(error).toBeNull();
    expect(data).toMatchObject({
      status: 'draft',
      created_by: adminId,
      updated_by: adminId,
    });

    // Audit columns have no grant: the client cannot write them at all.
    const forged = await insertAs(asAdmin, row('forged', { created_by: null }));
    expect(forged.error?.code).toBe('42501');
  });

  it('learners cannot insert, update or delete, and see published rows only', async () => {
    const insert = await insertAs(asLearner, row('learner'));
    expect(insert.error?.code).toBe('42501');

    const draft = await insertAs(asAdmin, row('draft'));
    const published = await insertAs(
      asAdmin,
      row('published', { status: 'published' }),
    );

    const { data: visible } = await asLearner
      .from('glossary_terms')
      .select('id')
      .in('id', [draft.data!.id, published.data!.id]);
    expect(visible).toEqual([{ id: published.data!.id }]);

    const update = await asLearner
      .from('glossary_terms')
      .update({ term: 'hacked' })
      .eq('id', published.data!.id)
      .select('id');
    expect(update.data).toEqual([]);
    const remove = await asLearner
      .from('glossary_terms')
      .delete()
      .eq('id', published.data!.id)
      .select('id');
    expect(remove.data).toEqual([]);
  });

  it('audit columns are not writable', async () => {
    const term = await insertAs(asAdmin, row('cols'));
    const { error } = await asAdmin
      .from('glossary_terms')
      .update({ created_by: null })
      .eq('id', term.data!.id);
    expect(error?.code).toBe('42501');
  });

  it('phrases: checked shape, unique across terms (23505, hint match)', async () => {
    const bad = await insertAs(
      asAdmin,
      row('bad', { match_phrases: [' padded '] }),
    );
    expect(bad.error?.code).toBe('23514');

    const phrase = `shared ${tag}`;
    const first = await insertAs(
      asAdmin,
      row('first', { match_phrases: [phrase] }),
    );
    expect(first.error).toBeNull();
    const second = await insertAs(
      asAdmin,
      row('second', { match_phrases: [phrase.toUpperCase()] }),
    );
    expect(second.error).toMatchObject({ code: '23505', hint: 'match' });
  });

  it('deleting a term removes it from the related lists', async () => {
    const a = await insertAs(asAdmin, row('rel-a'));
    const b = await insertAs(
      asAdmin,
      row('rel-b', { related_ids: [a.data!.id] }),
    );
    expect(b.data!.related_ids).toEqual([a.data!.id]);
    const self = await insertAs(asAdmin, row('rel-self'));
    const selfLink = await asAdmin
      .from('glossary_terms')
      .update({ related_ids: [self.data!.id] })
      .eq('id', self.data!.id);
    expect(selfLink.error?.code).toBe('23514');

    const { error } = await asAdmin
      .from('glossary_terms')
      .delete()
      .eq('id', a.data!.id);
    expect(error).toBeNull();
    const { data } = await asAdmin
      .from('glossary_terms')
      .select('related_ids')
      .eq('id', b.data!.id)
      .single<{ related_ids: string[] }>();
    expect(data!.related_ids).toEqual([]);
  });
});
