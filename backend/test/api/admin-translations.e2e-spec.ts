import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { SkillRow } from '../../src/learning/content.repository.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

let seq = 0;

interface Field {
  field: string;
  source: string;
  sourceHash: string;
  text: string | null;
  status: 'current' | 'stale' | 'missing';
  machineText: string | null;
  markdown: boolean;
}

describe('Admin translations API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;
  let skill: SkillRow;
  let adminToken: string;
  let learnerToken: string;

  const http = () => request(app.getHttpServer());
  const call = (
    method: 'get' | 'post' | 'put' | 'patch',
    path: string,
    token: string,
    body?: object,
  ) => {
    const req = http()
      [method](`/api/v1${path}`)
      .auth(token, { type: 'bearer' });
    return body ? req.send(body) : req;
  };
  const get = (path: string, token = adminToken) => call('get', path, token);
  const post = (path: string, body: object = {}) =>
    call('post', path, adminToken, body);
  const put = (path: string, body: object, token = adminToken) =>
    call('put', path, token, body);
  const patch = (path: string, body: object) =>
    call('patch', path, adminToken, body);

  async function user(role: 'learner' | 'admin') {
    const created = t.auth.createUser({
      email: `admin-i18n-e2e${++seq}@example.com`,
      password: 'correct-horse-battery',
    });
    t.profiles.rows.get(created.id)!.role = role;
    return t.auth.signAccessToken(created.id);
  }

  /** A published course → module → lesson, with one exercise. */
  async function tree() {
    const course = (
      await post('/admin/courses', {
        skillId: skill.id,
        title: 'Testing basics',
        slug: `testing-basics-${++seq}`,
        description: 'Start here',
      }).expect(201)
    ).body as { id: string; slug: string };
    const module = (
      await post(`/admin/courses/${course.id}/modules`, {
        title: 'First steps',
        status: 'published',
      }).expect(201)
    ).body as { id: string };
    const lesson = (
      await post(`/admin/modules/${module.id}/lessons`, {
        title: 'What is a bug',
        slug: `what-is-a-bug-${seq}`,
        contentMd: '# Bugs\n\nA bug is...\n\n```js\nx()\n```',
        status: 'published',
      }).expect(201)
    ).body as { id: string };
    const exercise = (
      await post(`/admin/lessons/${lesson.id}/exercises`, {
        type: 'scenario',
        question: 'How would you test it?',
        promptData: {},
        answerData: {
          expectedConcepts: [{ concept: 'Boundary', keywords: ['boundary'] }],
          modelAnswer: 'Test the boundaries.',
          rubric: [{ id: 'bva', text: 'I tested both boundaries' }],
        },
        explanation: 'Boundaries find bugs.',
        status: 'published',
      }).expect(201)
    ).body as { id: string };
    await post(`/admin/courses/${course.id}/publish`).expect(200);
    return { course, module, lesson, exercise };
  }

  const fieldsOf = (body: { fields: Field[] }) =>
    Object.fromEntries(body.fields.map((field) => [field.field, field]));

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    skill = t.content.addSkill('fundamentals', 1);
    adminToken = await user('admin');
    learnerToken = await user('learner');
  });

  beforeEach(() => t.translator.reset());

  afterAll(async () => {
    await app.close();
  });

  describe('access', () => {
    const id = randomUUID();
    const routes = ['courses', 'modules', 'lessons', 'exercises'].flatMap(
      (kind) =>
        (['get', 'put'] as const).map(
          (method) => [method, `/admin/${kind}/${id}/translations`] as const,
        ),
    );

    it.each(routes)('%s %s is 403 for a learner', async (method, path) => {
      await call(method, path, learnerToken, { fields: [] }).expect(403);
    });

    it.each(routes)('%s %s is 401 without a token', async (method, path) => {
      await http()[method](`/api/v1${path}`).expect(401);
    });

    it('answers 404 for unknown content', async () => {
      await get(`/admin/lessons/${id}/translations`).expect(404);
      await put(`/admin/modules/${id}/translations`, {
        fields: [{ field: 'title', sourceHash: 'a'.repeat(64), text: 'x' }],
      }).expect(404);
    });
  });

  it('lists every text of a row with its English and status', async () => {
    const { course, lesson, exercise } = await tree();

    const courseRes = await get(
      `/admin/courses/${course.id}/translations`,
    ).expect(200);
    expect(courseRes.body).toMatchObject({
      entityType: 'course',
      entityId: course.id,
      language: 'vi',
    });
    expect(
      (courseRes.body.fields as Field[]).map((f) => [f.field, f.status]),
    ).toEqual([
      ['title', 'missing'],
      ['description', 'missing'],
    ]);

    const lessonRes = await get(
      `/admin/lessons/${lesson.id}/translations`,
    ).expect(200);
    expect(fieldsOf(lessonRes.body).content_md).toMatchObject({
      markdown: true,
      source: '# Bugs\n\nA bug is...\n\n```js\nx()\n```',
      text: null,
    });

    // Review texts come from the answer key; admins see them all.
    const exerciseRes = await get(
      `/admin/exercises/${exercise.id}/translations`,
    ).expect(200);
    expect((exerciseRes.body.fields as Field[]).map((f) => f.field)).toEqual([
      'question',
      'explanation',
      'model_answer',
      'rubric.bva',
    ]);
  });

  it('saves manual translations that learners then read', async () => {
    const { course, lesson } = await tree();
    const before = fieldsOf(
      (await get(`/admin/lessons/${lesson.id}/translations`).expect(200)).body,
    );

    const res = await put(`/admin/lessons/${lesson.id}/translations`, {
      fields: [
        {
          field: 'title',
          sourceHash: before.title.sourceHash,
          text: '  Lỗi là gì  ',
        },
        {
          field: 'content_md',
          sourceHash: before.content_md.sourceHash,
          text: '# Lỗi\n\nLỗi là...\n\n```js\nx()\n```',
        },
      ],
    }).expect(200);
    const saved = fieldsOf(res.body);
    expect(saved.title).toMatchObject({ status: 'current', text: 'Lỗi là gì' });
    expect(saved.content_md.status).toBe('current');

    // The machine translator is not needed for these texts any more.
    t.translator.isEnabled = false;
    const learner = await get(
      `/lessons/${lesson.id}?lang=vi`,
      learnerToken,
    ).expect(200);
    expect(learner.body.title).toBe('Lỗi là gì');
    expect(learner.body.contentMd).toBe(
      '# Lỗi\n\nLỗi là...\n\n```js\nx()\n```',
    );

    // Course title is still missing: English, said by the status.
    const detail = await get(
      `/courses/${course.slug}?lang=vi`,
      learnerToken,
    ).expect(200);
    expect(detail.body.title).toBe('Testing basics');
    expect(detail.body.translation).toBe('unavailable');
  });

  it('marks a translation stale when the English changes, and refuses the old English', async () => {
    const { module } = await tree();
    const path = `/admin/modules/${module.id}/translations`;
    const first = fieldsOf((await get(path).expect(200)).body);
    await put(path, {
      fields: [
        {
          field: 'title',
          sourceHash: first.title.sourceHash,
          text: 'Bước đầu',
        },
      ],
    }).expect(200);

    await patch(`/admin/modules/${module.id}`, {
      title: 'Getting started',
    }).expect(200);
    const after = fieldsOf((await get(path).expect(200)).body);
    expect(after.title).toMatchObject({
      status: 'stale',
      text: 'Bước đầu',
      source: 'Getting started',
    });

    // Translated from the old English: 409, nothing written.
    const conflict = await put(path, {
      fields: [
        { field: 'title', sourceHash: first.title.sourceHash, text: 'Bắt đầu' },
      ],
    }).expect(409);
    expect(conflict.body.details).toEqual([
      {
        field: 'fields[0].sourceHash',
        message: 'The English text changed since it was loaded',
      },
    ]);
    expect(fieldsOf((await get(path).expect(200)).body).title.text).toBe(
      'Bước đầu',
    );

    // Retranslated from the new English: current again.
    const res = await put(path, {
      fields: [
        { field: 'title', sourceHash: after.title.sourceHash, text: 'Bắt đầu' },
      ],
    }).expect(200);
    expect(fieldsOf(res.body).title).toMatchObject({
      status: 'current',
      text: 'Bắt đầu',
    });
  });

  it('removes a manual translation with null', async () => {
    const { course } = await tree();
    const path = `/admin/courses/${course.id}/translations`;
    const fields = fieldsOf((await get(path).expect(200)).body);
    await put(path, {
      fields: [
        { field: 'title', sourceHash: fields.title.sourceHash, text: 'Cơ bản' },
      ],
    }).expect(200);
    const res = await put(path, {
      fields: [
        { field: 'title', sourceHash: fields.title.sourceHash, text: null },
      ],
    }).expect(200);
    expect(fieldsOf(res.body).title).toMatchObject({
      status: 'missing',
      text: null,
    });
  });

  it('offers the cached machine translation as a draft', async () => {
    const { lesson } = await tree();
    // A learner reading in Vietnamese fills the machine cache.
    await get(`/lessons/${lesson.id}?lang=vi`, learnerToken).expect(200);
    const res = await get(`/admin/lessons/${lesson.id}/translations`).expect(
      200,
    );
    expect(fieldsOf(res.body).title).toMatchObject({
      status: 'missing',
      text: null,
      machineText: 'VI: What is a bug',
    });
  });

  it('validates the body and writes nothing when one field is wrong', async () => {
    const { lesson, exercise } = await tree();
    const path = `/admin/lessons/${lesson.id}/translations`;
    const fields = fieldsOf((await get(path).expect(200)).body);
    const title = { field: 'title', sourceHash: fields.title.sourceHash };

    await put(path, { fields: [] }).expect(400);
    await put(path, { fields: [{ ...title }] }).expect(400);
    await put(path, {
      fields: [{ ...title, text: 'x', provider: 'google' }],
    }).expect(400);
    await put(path, {
      fields: [{ ...title, text: 'x' }],
      language: 'en',
    }).expect(400);
    await put(path, {
      fields: [{ field: 'title', sourceHash: 'nope', text: 'x' }],
    }).expect(400);

    const res = await put(path, {
      fields: [
        { ...title, text: 'Lỗi là gì' },
        {
          field: 'content_md',
          sourceHash: fields.content_md.sourceHash,
          text: 'Không có tiêu đề',
        },
        {
          field: 'description',
          sourceHash: fields.title.sourceHash,
          text: 'x',
        },
        { ...title, text: '   ' },
      ],
    }).expect(400);
    expect(res.body.details).toEqual([
      {
        field: 'fields[1].text',
        message: 'text has 0 headings, English has 1',
      },
      {
        field: 'fields[1].text',
        message: 'text must have the same code blocks as English',
      },
      {
        field: 'fields[2].field',
        message: 'description is not a text of this content',
      },
      { field: 'fields[3].field', message: 'field is listed twice' },
    ]);
    expect(fieldsOf((await get(path).expect(200)).body).title.status).toBe(
      'missing',
    );

    // A label longer than its field allows.
    const exPath = `/admin/exercises/${exercise.id}/translations`;
    const ex = fieldsOf((await get(exPath).expect(200)).body);
    const tooLong = await put(exPath, {
      fields: [
        {
          field: 'rubric.bva',
          sourceHash: ex['rubric.bva'].sourceHash,
          text: 'x'.repeat(501),
        },
      ],
    }).expect(400);
    expect(tooLong.body.details).toEqual([
      {
        field: 'fields[0].text',
        message: 'text must be at most 500 characters',
      },
    ]);
  });

  it('keeps review-text translations hidden from learners without an attempt', async () => {
    const { exercise } = await tree();
    const path = `/admin/exercises/${exercise.id}/translations`;
    const fields = fieldsOf((await get(path).expect(200)).body);
    await put(path, {
      fields: [
        {
          field: 'question',
          sourceHash: fields.question.sourceHash,
          text: 'Bạn sẽ kiểm thử thế nào?',
        },
        {
          field: 'explanation',
          sourceHash: fields.explanation.sourceHash,
          text: 'Biên tìm ra lỗi.',
        },
      ],
    }).expect(200);
    const learnerRows = await t.translations.findForEntities(
      learnerToken,
      [exercise.id],
      'vi',
    );
    expect(learnerRows.map((row) => row.field)).toEqual(['question']);
  });
});
