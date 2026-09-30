import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { SkillRow } from '../../src/learning/content.repository.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

let seq = 0;

const mcPrompt = {
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
  ],
  multiple: false,
};

const scenarioKey = {
  expectedConcepts: [{ concept: 'Boundary', keywords: ['boundary'] }],
  modelAnswer: 'Test the boundaries.',
  rubric: [{ id: 'bva', text: 'I tested both boundaries' }],
};

describe('Admin API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;
  let skill: SkillRow;
  let otherSkill: SkillRow;
  let adminToken: string;
  let learnerToken: string;

  const http = () => request(app.getHttpServer());
  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
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
  const post = (path: string, body: object = {}, token = adminToken) =>
    call('post', path, token, body);
  const patch = (path: string, body: object, token = adminToken) =>
    call('patch', path, token, body);
  const del = (path: string, token = adminToken) => call('delete', path, token);

  async function user(role: 'learner' | 'admin') {
    const created = t.auth.createUser({
      email: `admin-e2e${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName: role,
    });
    t.profiles.rows.get(created.id)!.role = role;
    return t.auth.signAccessToken(created.id);
  }

  async function course(slug = `course-${++seq}`, skillId = skill.id) {
    const res = await post('/admin/courses', {
      skillId,
      title: `Course ${slug}`,
      slug,
    }).expect(201);
    return res.body as { id: string; slug: string };
  }

  async function module(courseId: string, status = 'published') {
    const res = await post(`/admin/courses/${courseId}/modules`, {
      title: `Module ${++seq}`,
      status,
    }).expect(201);
    return res.body as { id: string };
  }

  async function lesson(
    moduleId: string,
    status = 'published',
    slug = `lesson-${++seq}`,
  ) {
    const res = await post(`/admin/modules/${moduleId}/lessons`, {
      title: `Lesson ${slug}`,
      slug,
      contentMd: '# Hello\n\nBody.',
      status,
    }).expect(201);
    return res.body as { id: string };
  }

  async function exercise(lessonId: string, status = 'published') {
    const res = await post(`/admin/lessons/${lessonId}/exercises`, {
      type: 'multiple_choice',
      question: 'Which one?',
      promptData: mcPrompt,
      answerData: { correct: ['b'] },
      explanation: 'B is right.',
      status,
    }).expect(201);
    return res.body as { id: string };
  }

  /** A published course with a published module and lesson. */
  async function publishedTree() {
    const c = await course();
    const m = await module(c.id);
    const l = await lesson(m.id);
    await post(`/admin/courses/${c.id}/publish`).expect(200);
    return { course: c, module: m, lesson: l };
  }

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    skill = t.content.addSkill('fundamentals', 1);
    otherSkill = t.content.addSkill('test_design', 2);
    adminToken = await user('admin');
    learnerToken = await user('learner');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('access', () => {
    const id = randomUUID();
    const routes: ['get' | 'post' | 'patch' | 'delete', string][] = [
      ['get', '/admin/courses'],
      ['post', '/admin/courses'],
      ['patch', '/admin/courses/reorder'],
      ['get', `/admin/courses/${id}`],
      ['patch', `/admin/courses/${id}`],
      ['delete', `/admin/courses/${id}`],
      ['post', `/admin/courses/${id}/publish`],
      ['post', `/admin/courses/${id}/unpublish`],
      ['post', `/admin/courses/${id}/archive`],
      ['post', `/admin/courses/${id}/modules`],
      ['patch', `/admin/courses/${id}/modules/reorder`],
      ['patch', `/admin/modules/${id}`],
      ['delete', `/admin/modules/${id}`],
      ['post', `/admin/modules/${id}/lessons`],
      ['patch', `/admin/modules/${id}/lessons/reorder`],
      ['get', `/admin/lessons/${id}`],
      ['patch', `/admin/lessons/${id}`],
      ['delete', `/admin/lessons/${id}`],
      ['post', `/admin/lessons/${id}/exercises`],
      ['patch', `/admin/lessons/${id}/exercises/reorder`],
      ['get', `/admin/exercises/${id}`],
      ['patch', `/admin/exercises/${id}`],
      ['delete', `/admin/exercises/${id}`],
    ];

    it.each(routes)('%s %s is 403 for a learner', async (method, path) => {
      const res = await call(method, path, learnerToken, {}).expect(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it.each(routes)('%s %s is 401 without a token', async (method, path) => {
      await http()[method](`/api/v1${path}`).expect(401);
    });

    it('does not let a learner change content even with valid bodies', async () => {
      const c = await course();
      await patch(
        `/admin/courses/${c.id}`,
        { title: 'Hacked' },
        learnerToken,
      ).expect(403);
      await del(`/admin/courses/${c.id}`, learnerToken).expect(403);
      const res = await get(`/admin/courses/${c.id}`).expect(200);
      expect(res.body.title).not.toBe('Hacked');
    });
  });

  describe('courses', () => {
    it('creates a draft course at the end of its skill', async () => {
      const first = await course();
      const second = await course();
      const res = await get(`/admin/courses/${second.id}`).expect(200);
      expect(res.body).toMatchObject({
        slug: second.slug,
        status: 'draft',
        inUse: false,
        canPublish: false,
        modules: [],
        skill: { id: skill.id, code: 'fundamentals' },
      });
      const firstRes = await get(`/admin/courses/${first.id}`);
      expect(res.body.orderIndex).toBeGreaterThan(firstRes.body.orderIndex);
    });

    it('validates the body', async () => {
      const bad = await post('/admin/courses', {
        skillId: skill.id,
        title: '   ',
        slug: 'Not A Slug',
      }).expect(400);
      const fields = bad.body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['title', 'slug']));

      await post('/admin/courses', {
        skillId: skill.id,
        title: 'T',
        slug: 'ok-slug',
        status: 'published',
      }).expect(400);

      const unknownSkill = await post('/admin/courses', {
        skillId: randomUUID(),
        title: 'T',
        slug: `unknown-skill-${++seq}`,
      }).expect(400);
      expect(unknownSkill.body.details).toEqual([
        { field: 'skillId', message: 'skillId is not a skill' },
      ]);
    });

    it('rejects a used slug with 409 on create and update', async () => {
      const a = await course();
      const b = await course();
      const created = await post('/admin/courses', {
        skillId: otherSkill.id,
        title: 'Copy',
        slug: a.slug,
      }).expect(409);
      expect(created.body.details).toEqual([
        { field: 'slug', message: 'slug is already used by another course' },
      ]);
      await patch(`/admin/courses/${b.id}`, { slug: a.slug }).expect(409);
      // Its own slug is fine.
      await patch(`/admin/courses/${a.id}`, { slug: a.slug }).expect(200);
    });

    it('updates fields, and returns the course unchanged for an empty body', async () => {
      const c = await course();
      const res = await patch(`/admin/courses/${c.id}`, {
        title: '  New title  ',
        description: 'About it',
      }).expect(200);
      expect(res.body).toMatchObject({
        title: 'New title',
        description: 'About it',
      });
      const same = await patch(`/admin/courses/${c.id}`, {}).expect(200);
      expect(same.body.title).toBe('New title');
    });

    it('moves a course to the end of another skill', async () => {
      const existing = await course(undefined, otherSkill.id);
      const c = await course();
      const res = await patch(`/admin/courses/${c.id}`, {
        skillId: otherSkill.id,
      }).expect(200);
      const other = await get(`/admin/courses/${existing.id}`);
      expect(res.body.skill.code).toBe('test_design');
      expect(res.body.orderIndex).toBeGreaterThan(other.body.orderIndex);
    });

    it('lists every status with filters and counts', async () => {
      const draft = await course();
      const { course: published } = await publishedTree();

      const all = await get('/admin/courses?pageSize=100').expect(200);
      const ids = all.body.items.map((item: { id: string }) => item.id);
      expect(ids).toEqual(expect.arrayContaining([draft.id, published.id]));

      const onlyPublished = await get(
        '/admin/courses?status=published&skill=fundamentals&pageSize=100',
      ).expect(200);
      expect(
        onlyPublished.body.items.every(
          (i: { status: string }) => i.status === 'published',
        ),
      ).toBe(true);
      const item = onlyPublished.body.items.find(
        (i: { id: string }) => i.id === published.id,
      );
      expect(item).toMatchObject({
        moduleCount: 1,
        lessonCount: 1,
        publishedLessonCount: 1,
      });

      const unknown = await get('/admin/courses?skill=nope').expect(200);
      expect(unknown.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
      await get('/admin/courses?status=gone').expect(400);
      await get('/admin/courses?lang=vi').expect(400);
    });

    it('returns 404 for an unknown course and 400 for a bad id', async () => {
      await get(`/admin/courses/${randomUUID()}`).expect(404);
      await get('/admin/courses/not-a-uuid').expect(400);
    });
  });

  describe('publish rules and learner visibility', () => {
    it('refuses to publish a course without a published lesson', async () => {
      const c = await course();
      const m = await module(c.id);
      await lesson(m.id, 'draft');
      const res = await post(`/admin/courses/${c.id}/publish`).expect(409);
      expect(res.body.message).toMatch(/lesson in a published module/);
    });

    it('shows learners published content only, admins everything', async () => {
      const { course: c, module: m, lesson: l } = await publishedTree();
      const draftLesson = await lesson(m.id, 'draft');
      const draftExercise = await exercise(l.id, 'draft');
      const publishedExercise = await exercise(l.id, 'published');

      await get(`/courses/${c.slug}`, learnerToken).expect(200);
      await get(`/lessons/${l.id}`, learnerToken).expect(200);
      await get(`/lessons/${draftLesson.id}`, learnerToken).expect(404);
      await get(`/exercises/${draftExercise.id}`, learnerToken).expect(404);
      await get(`/exercises/${publishedExercise.id}`, learnerToken).expect(200);
      await get(`/admin/lessons/${draftLesson.id}`).expect(200);

      const lessonRes = await get(`/admin/lessons/${l.id}`).expect(200);
      expect(lessonRes.body.visibleToLearners).toBe(true);

      await post(`/admin/courses/${c.id}/unpublish`).expect(200);
      await get(`/courses/${c.slug}`, learnerToken).expect(404);
      await get(`/lessons/${l.id}`, learnerToken).expect(404);
      await get(`/exercises/${publishedExercise.id}`, learnerToken).expect(404);
      const hidden = await get(`/admin/lessons/${l.id}`).expect(200);
      expect(hidden.body.visibleToLearners).toBe(false);

      await post(`/admin/courses/${c.id}/publish`).expect(200);
      await post(`/admin/courses/${c.id}/archive`).expect(200);
      await get(`/courses/${c.slug}`, learnerToken).expect(404);
    });

    it('never returns the answer key to learners', async () => {
      const { lesson: l } = await publishedTree();
      const e = await exercise(l.id);
      const res = await get(`/exercises/${e.id}`, learnerToken).expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/correct|B is right/);

      const graded = await post(
        `/exercises/${e.id}/attempts`,
        { answer: { selected: ['b'] } },
        learnerToken,
      ).expect(201);
      expect(graded.body.attempt).toMatchObject({
        score: 100,
        isCorrect: true,
      });
    });
  });

  describe('delete rules', () => {
    it('hard-deletes unused content with everything under it', async () => {
      const c = await course();
      const m = await module(c.id);
      const l = await lesson(m.id);
      const e = await exercise(l.id);
      await del(`/admin/courses/${c.id}`).expect(204);
      await get(`/admin/courses/${c.id}`).expect(404);
      await get(`/admin/lessons/${l.id}`).expect(404);
      await get(`/admin/exercises/${e.id}`).expect(404);
      expect(t.answers.rows.has(e.id)).toBe(false);
      await del(`/admin/courses/${c.id}`).expect(404);
    });

    it('blocks deleting content with learner progress, at every level', async () => {
      const { course: c, module: m, lesson: l } = await publishedTree();
      await post(`/lessons/${l.id}/progress`, {}, learnerToken).expect(200);

      const tree = await get(`/admin/courses/${c.id}`).expect(200);
      expect(tree.body.inUse).toBe(true);
      expect(tree.body.modules[0]).toMatchObject({ inUse: true });
      expect(tree.body.modules[0].lessons[0]).toMatchObject({ inUse: true });

      for (const path of [
        `/admin/lessons/${l.id}`,
        `/admin/modules/${m.id}`,
        `/admin/courses/${c.id}`,
      ]) {
        const res = await del(path).expect(409);
        expect(res.body.message).toMatch(/Archive it instead/);
      }
      await patch(`/admin/lessons/${l.id}`, { status: 'archived' }).expect(200);
      await get(`/lessons/${l.id}`, learnerToken).expect(404);
    });

    it('blocks deleting an attempted exercise but not its siblings', async () => {
      const { lesson: l } = await publishedTree();
      const attempted = await exercise(l.id);
      const fresh = await exercise(l.id);
      await post(
        `/exercises/${attempted.id}/attempts`,
        { answer: { selected: ['a'] } },
        learnerToken,
      ).expect(201);

      await del(`/admin/exercises/${attempted.id}`).expect(409);
      await del(`/admin/lessons/${l.id}`).expect(409);
      await del(`/admin/exercises/${fresh.id}`).expect(204);
    });

    it('answers 409 when the database refuses (progress written meanwhile)', async () => {
      const { lesson: l, module: m } = await publishedTree();
      await post(`/lessons/${l.id}/progress`, {}, learnerToken).expect(200);
      // The service's check sees no usage; the foreign key still refuses.
      const usage = t.admin.usage;
      const remove = t.admin.remove;
      t.admin.usage = async () => ({
        lessons: new Set(),
        exercises: new Set(),
      });
      t.admin.remove = async (token, kind, id) => {
        t.admin.usage = usage;
        return remove.call(t.admin, token, kind, id);
      };
      try {
        await del(`/admin/modules/${m.id}`).expect(409);
      } finally {
        t.admin.usage = usage;
        t.admin.remove = remove;
      }
    });
  });

  describe('modules and lessons', () => {
    it('adds modules and lessons at the end and reorders them', async () => {
      const c = await course();
      const m1 = await module(c.id);
      const m2 = await module(c.id);
      const m3 = await module(c.id);

      await patch(`/admin/courses/${c.id}/modules/reorder`, {
        ids: [m3.id, m1.id, m2.id],
      }).expect(204);
      const tree = await get(`/admin/courses/${c.id}`);
      expect(tree.body.modules.map((m: { id: string }) => m.id)).toEqual([
        m3.id,
        m1.id,
        m2.id,
      ]);
      expect(
        tree.body.modules.map((m: { orderIndex: number }) => m.orderIndex),
      ).toEqual([1, 2, 3]);

      const incomplete = await patch(`/admin/courses/${c.id}/modules/reorder`, {
        ids: [m1.id, m2.id],
      }).expect(400);
      expect(incomplete.body.details[0].field).toBe('ids');
      const other = await module((await course()).id);
      await patch(`/admin/courses/${c.id}/modules/reorder`, {
        ids: [m1.id, m2.id, m3.id, other.id],
      }).expect(400);
      await patch(`/admin/courses/${c.id}/modules/reorder`, {
        ids: ['nope'],
      }).expect(400);

      const l1 = await lesson(m1.id);
      const l2 = await lesson(m1.id);
      await patch(`/admin/modules/${m1.id}/lessons/reorder`, {
        ids: [l2.id, l1.id],
      }).expect(204);
      const after = await get(`/admin/courses/${c.id}`);
      const lessons = after.body.modules.find(
        (m: { id: string }) => m.id === m1.id,
      ).lessons;
      expect(lessons.map((l: { id: string }) => l.id)).toEqual([l2.id, l1.id]);
    });

    it('reorders courses within a skill', async () => {
      const skillOnly = t.content.addSkill(`reorder_${++seq}`, 50);
      const a = await course(undefined, skillOnly.id);
      const b = await course(undefined, skillOnly.id);
      await patch('/admin/courses/reorder', {
        skillId: skillOnly.id,
        ids: [b.id, a.id],
      }).expect(204);
      const list = await get(`/admin/courses?skill=${skillOnly.code}`);
      expect(list.body.items.map((i: { id: string }) => i.id)).toEqual([
        b.id,
        a.id,
      ]);
      await patch('/admin/courses/reorder', {
        skillId: skillOnly.id,
        ids: [a.id],
      }).expect(400);
    });

    it('updates a module; an empty body changes nothing', async () => {
      const c = await course();
      const m = await module(c.id, 'draft');
      const res = await patch(`/admin/modules/${m.id}`, {
        title: 'Renamed',
        status: 'published',
      }).expect(200);
      expect(res.body).toMatchObject({ title: 'Renamed', status: 'published' });
      await patch(`/admin/modules/${m.id}`, {}).expect(200);
      await patch(`/admin/modules/${m.id}`, { courseId: randomUUID() }).expect(
        400,
      );
      await patch(`/admin/modules/${randomUUID()}`, { title: 'X' }).expect(404);
    });

    it('keeps lesson slugs unique within a module only', async () => {
      const c = await course();
      const m1 = await module(c.id);
      const m2 = await module(c.id);
      await lesson(m1.id, 'draft', 'same-slug');
      const res = await post(`/admin/modules/${m1.id}/lessons`, {
        title: 'Again',
        slug: 'same-slug',
      }).expect(409);
      expect(res.body.details).toEqual([
        {
          field: 'slug',
          message: 'slug is already used by another lesson in this module',
        },
      ]);
      await lesson(m2.id, 'draft', 'same-slug');
      const other = await lesson(m1.id, 'draft');
      await patch(`/admin/lessons/${other.id}`, { slug: 'same-slug' }).expect(
        409,
      );
    });

    it('edits a lesson and returns its draft content', async () => {
      const c = await course();
      const m = await module(c.id);
      const l = await lesson(m.id, 'draft');
      const res = await patch(`/admin/lessons/${l.id}`, {
        contentMd: '## New body',
        estimatedMinutes: 12,
      }).expect(200);
      expect(res.body).toMatchObject({
        contentMd: '## New body',
        estimatedMinutes: 12,
        status: 'draft',
        visibleToLearners: false,
        course: { id: c.id, status: 'draft' },
      });
      await patch(`/admin/lessons/${l.id}`, { estimatedMinutes: 0 }).expect(
        400,
      );
      await patch(`/admin/lessons/${l.id}`, {
        contentMd: 'x'.repeat(100_001),
      }).expect(400);
      await patch(`/admin/lessons/${l.id}`, { moduleId: m.id }).expect(400);
    });
  });

  describe('exercises', () => {
    it('creates an exercise with its answer key, readable by admins only', async () => {
      const { lesson: l } = await publishedTree();
      const e = await exercise(l.id, 'draft');
      const res = await get(`/admin/exercises/${e.id}`).expect(200);
      expect(res.body).toMatchObject({
        type: 'multiple_choice',
        status: 'draft',
        answerData: { correct: ['b'] },
        explanation: 'B is right.',
        visibleToLearners: false,
        inUse: false,
      });
      const lessonRes = await get(`/admin/lessons/${l.id}`);
      expect(
        lessonRes.body.exercises.map((x: { id: string }) => x.id),
      ).toContain(e.id);
      expect(JSON.stringify(lessonRes.body.exercises)).not.toMatch(/correct/);
    });

    it('checks prompt data and answer key against the type', async () => {
      const { lesson: l } = await publishedTree();
      const wrongKey = await post(`/admin/lessons/${l.id}/exercises`, {
        type: 'multiple_choice',
        question: 'Q',
        promptData: mcPrompt,
        answerData: { correct: ['z'] },
      }).expect(400);
      expect(wrongKey.body.details).toEqual([
        { field: 'answerData.correct', message: 'correct has unknown id z' },
      ]);

      const badPrompt = await post(`/admin/lessons/${l.id}/exercises`, {
        type: 'classification',
        question: 'Q',
        promptData: { categories: [], items: [], extra: 1 },
        answerData: { mapping: {} },
      }).expect(400);
      const fields = badPrompt.body.details.map(
        (d: { field: string }) => d.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining(['promptData.extra', 'promptData.categories']),
      );

      const scenario = await post(`/admin/lessons/${l.id}/exercises`, {
        type: 'scenario',
        question: 'Describe',
        promptData: {},
        answerData: scenarioKey,
        difficulty: 'hard',
      }).expect(201);
      expect(scenario.body).toMatchObject({
        type: 'scenario',
        difficulty: 'hard',
      });
    });

    it('never changes the type, and checks a new prompt with the stored key', async () => {
      const { lesson: l } = await publishedTree();
      const e = await exercise(l.id);
      await patch(`/admin/exercises/${e.id}`, { type: 'scenario' }).expect(400);

      const orphanKey = await patch(`/admin/exercises/${e.id}`, {
        promptData: {
          options: [
            { id: 'x', text: 'X' },
            { id: 'y', text: 'Y' },
          ],
        },
      }).expect(400);
      expect(orphanKey.body.details[0].field).toBe('answerData.correct');

      const res = await patch(`/admin/exercises/${e.id}`, {
        promptData: {
          options: [
            { id: 'x', text: 'X' },
            { id: 'y', text: 'Y' },
          ],
        },
        answerData: { correct: ['y'] },
        question: 'New question',
      }).expect(200);
      expect(res.body).toMatchObject({
        question: 'New question',
        answerData: { correct: ['y'] },
      });

      const explained = await patch(`/admin/exercises/${e.id}`, {
        explanation: 'Why Y',
      }).expect(200);
      expect(explained.body).toMatchObject({
        explanation: 'Why Y',
        answerData: { correct: ['y'] },
      });
    });

    it('locks option ids once learners have attempted the exercise', async () => {
      const { lesson: l } = await publishedTree();
      const e = await exercise(l.id);
      await post(
        `/exercises/${e.id}/attempts`,
        { answer: { selected: ['a'] } },
        learnerToken,
      ).expect(201);

      const locked = await patch(`/admin/exercises/${e.id}`, {
        promptData: { options: [...mcPrompt.options, { id: 'c', text: 'C' }] },
      }).expect(400);
      expect(locked.body.details[0].field).toBe('promptData.options');

      const texts = await patch(`/admin/exercises/${e.id}`, {
        promptData: {
          options: [
            { id: 'a', text: 'First' },
            { id: 'b', text: 'Second' },
          ],
        },
      }).expect(200);
      expect(texts.body).toMatchObject({ inUse: true });
    });

    it('reorders exercises of a lesson', async () => {
      const { lesson: l } = await publishedTree();
      const a = await exercise(l.id);
      const b = await exercise(l.id);
      await patch(`/admin/lessons/${l.id}/exercises/reorder`, {
        ids: [b.id, a.id],
      }).expect(204);
      const res = await get(`/admin/lessons/${l.id}`);
      expect(res.body.exercises.map((x: { id: string }) => x.id)).toEqual([
        b.id,
        a.id,
      ]);
    });
  });
});
