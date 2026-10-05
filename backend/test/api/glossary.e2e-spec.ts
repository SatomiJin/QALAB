import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

let seq = 0;

describe('Glossary API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;
  let adminToken: string;
  let learnerToken: string;

  const http = () => request(app.getHttpServer());
  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    token = adminToken,
    body?: object,
  ) => {
    const req = http()
      [method](`/api/v1${path}`)
      .auth(token, { type: 'bearer' });
    return body ? req.send(body) : req;
  };

  async function token(role: 'learner' | 'admin') {
    const user = t.auth.createUser({
      email: `glossary-e2e${++seq}@example.com`,
      password: 'correct-horse-battery',
    });
    t.profiles.rows.get(user.id)!.role = role;
    return t.auth.signAccessToken(user.id);
  }

  const body = (over: object = {}) => ({
    slug: `term-${++seq}`,
    term: `Term ${seq}`,
    skill: 'test_docs',
    matchPhrases: [`phrase ${seq}`],
    definitionEn: 'In English.',
    definitionVi: 'Bằng tiếng Việt.',
    ...over,
  });

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    adminToken = await token('admin');
    learnerToken = await token('learner');
  });

  beforeEach(() => t.glossary.rows.clear());

  afterAll(async () => {
    await app.close();
  });

  describe('access', () => {
    const id = randomUUID();
    const routes: ['get' | 'post' | 'patch' | 'delete', string, object?][] = [
      ['get', '/admin/glossary'],
      ['post', '/admin/glossary', {}],
      ['get', `/admin/glossary/${id}`],
      ['patch', `/admin/glossary/${id}`, {}],
      ['delete', `/admin/glossary/${id}`],
    ];

    it.each(routes)(
      '%s %s: 403 for a learner (before validation)',
      async (method, path, payload) => {
        await call(method, path, learnerToken, payload).expect(403);
      },
    );

    it.each(routes)('%s %s: 401 without a token', async (method, path) => {
      await http()[method](`/api/v1${path}`).expect(401);
    });

    it('GET /glossary needs a session', async () => {
      await http().get('/api/v1/glossary').expect(401);
    });
  });

  describe('GET /glossary (learner)', () => {
    it('lists published terms only, related limited to visible ones', async () => {
      const draft = t.glossary.add({
        slug: 'draft',
        term: 'Draft',
        status: 'draft',
      });
      const other = t.glossary.add({ slug: 'other', term: 'Other' });
      t.glossary.add({
        slug: 'test-case',
        term: 'Test case',
        vi_name: 'Ca kiểm thử',
        match_phrases: ['test case'],
        related_ids: [draft.id, other.id],
      });

      for (const caller of [learnerToken, adminToken]) {
        const res = await call('get', '/glossary', caller).expect(200);
        expect(
          res.body.items.map((item: { slug: string }) => item.slug),
        ).toEqual(['other', 'test-case']);
        expect(res.body.items[1]).toEqual({
          id: expect.any(String),
          slug: 'test-case',
          term: 'Test case',
          viName: 'Ca kiểm thử',
          skill: 'fundamentals',
          matchPhrases: ['test case'],
          definitionEn: 'About test-case',
          definitionVi: 'Về test-case',
          related: ['other'],
        });
      }
    });
  });

  describe('admin', () => {
    it('creates a draft, lists it with usage per course, updates and deletes it', async () => {
      const skill = t.content.addSkill(`s${++seq}`);
      const course = t.content.addCourse(skill, `course-${seq}`);
      const module = t.content.addModule(course, 'M');
      const lesson = t.content.addLesson(module, `lesson-${seq}`, {
        status: 'draft',
      });
      lesson.content_md =
        'Write a good Bug Report. `bug report` in code does not count.';

      const created = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body({ matchPhrases: ['bug report'] }),
      ).expect(201);
      expect(created.body).toMatchObject({
        status: 'draft',
        viName: null,
        relatedIds: [],
        usage: { lessons: 1, courseIds: [course.id] },
      });
      const id = created.body.id as string;

      const learnerView = await call('get', '/glossary', learnerToken).expect(
        200,
      );
      expect(learnerView.body.items).toEqual([]);

      const list = await call('get', '/admin/glossary').expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.courses).toEqual(
        expect.arrayContaining([{ id: course.id, title: course.title }]),
      );

      const patched = await call('patch', `/admin/glossary/${id}`, adminToken, {
        status: 'published',
        viName: '  Báo cáo lỗi ',
        matchPhrases: ['  defect report '],
      }).expect(200);
      expect(patched.body).toMatchObject({
        status: 'published',
        viName: 'Báo cáo lỗi',
        matchPhrases: ['defect report'],
        usage: { lessons: 0, courseIds: [] },
      });

      const unchanged = await call(
        'patch',
        `/admin/glossary/${id}`,
        adminToken,
        {},
      ).expect(200);
      expect(unchanged.body.updatedAt).toBe(patched.body.updatedAt);

      await call('get', `/admin/glossary/${id}`).expect(200);
      await call('delete', `/admin/glossary/${id}`).expect(204);
      await call('get', `/admin/glossary/${id}`).expect(404);
      await call('delete', `/admin/glossary/${id}`).expect(404);
      await call('patch', `/admin/glossary/${id}`, adminToken, {
        term: 'X',
      }).expect(404);
    });

    it('validates fields and rejects unknown ones', async () => {
      const res = await call('post', '/admin/glossary', adminToken, {
        slug: 'Bad Slug',
        term: '',
        skill: 'nope',
        matchPhrases: ['x', 'a'.repeat(61)],
        definitionEn: 'a'.repeat(501),
        relatedIds: ['not-a-uuid'],
        createdBy: randomUUID(),
      }).expect(400);
      const fields = (res.body.details as { field: string }[]).map(
        (d) => d.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining([
          'slug',
          'term',
          'skill',
          'matchPhrases',
          'definitionEn',
          'definitionVi',
          'relatedIds',
          'createdBy',
        ]),
      );
    });

    it('rejects a phrase twice in one term, unknown or self related ids', async () => {
      const own = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body(),
      ).expect(201);
      const res = await call(
        'patch',
        `/admin/glossary/${own.body.id}`,
        adminToken,
        {
          matchPhrases: ['test step', 'Test Step'],
          relatedIds: [own.body.id, randomUUID()],
        },
      ).expect(400);
      expect(res.body.details).toEqual([
        { field: 'matchPhrases[1]', message: 'phrase is listed twice' },
        {
          field: 'relatedIds[0]',
          message: 'a term cannot be related to itself',
        },
        { field: 'relatedIds[1]', message: 'term does not exist' },
      ]);
    });

    it('409 for a slug or a phrase another term uses, also when the DB catches it', async () => {
      const first = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body({ slug: 'test-case', matchPhrases: ['test case'] }),
      ).expect(201);
      expect(first.body.slug).toBe('test-case');

      const slug = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body({ slug: 'test-case' }),
      ).expect(409);
      expect(slug.body.details).toEqual([
        { field: 'slug', message: expect.stringContaining('already used') },
      ]);

      const phrase = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body({ matchPhrases: ['other', 'TEST CASE'] }),
      ).expect(409);
      expect(phrase.body.details).toEqual([
        {
          field: 'matchPhrases[1]',
          message: `phrase is already used by "${first.body.term}"`,
        },
      ]);

      // Race: another admin adds the phrase between the check and the write.
      const list = t.glossary.list.bind(t.glossary);
      t.glossary.list = async (...args) =>
        (await list(...args)).filter((row) => row.slug !== 'test-case');
      try {
        const race = await call(
          'post',
          '/admin/glossary',
          adminToken,
          body({ matchPhrases: ['test case'] }),
        ).expect(409);
        expect(race.body.details).toEqual([
          { field: 'matchPhrases', message: expect.any(String) },
        ]);
      } finally {
        t.glossary.list = list;
      }
    });

    it('deleting a term removes it from the related lists', async () => {
      const a = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body(),
      ).expect(201);
      const b = await call(
        'post',
        '/admin/glossary',
        adminToken,
        body({ relatedIds: [a.body.id] }),
      ).expect(201);
      expect(b.body.relatedIds).toEqual([a.body.id]);
      await call('delete', `/admin/glossary/${a.body.id}`).expect(204);
      const after = await call('get', `/admin/glossary/${b.body.id}`).expect(
        200,
      );
      expect(after.body.relatedIds).toEqual([]);
    });
  });
});
