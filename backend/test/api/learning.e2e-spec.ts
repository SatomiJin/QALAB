import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type {
  CourseRow,
  LessonRow,
} from '../../src/learning/content.repository.js';
import { FakeAuthServer } from '../support/fake-auth-server.js';
import { FakeContentRepository } from '../support/fake-learning.js';
import { createTestApp } from '../support/create-test-app.js';

let seq = 0;

const emptyPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  language: 'en',
  translation: 'none',
};

describe('Learning API (e2e)', () => {
  let app: INestApplication<App>;
  let auth: FakeAuthServer;
  let content: FakeContentRepository;

  // basics (fundamentals): M1 [l1, l2, draft], M2 [l3], draft module [hidden]
  // design (test_design): D1 [d1]
  // secret (draft course): S1 [s1]
  let basics: CourseRow;
  let l1: LessonRow;
  let l2: LessonRow;
  let l3: LessonRow;
  let d1: LessonRow;
  let draftLesson: LessonRow;
  let lessonInDraftModule: LessonRow;
  let lessonInDraftCourse: LessonRow;

  const http = () => request(app.getHttpServer());

  async function signedIn() {
    const user = auth.createUser({
      email: `learning${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName: 'Learner',
    });
    return auth.signAccessToken(user.id);
  }

  const get = (path: string, token: string) =>
    http().get(`/api/v1${path}`).auth(token, { type: 'bearer' });

  const post = (path: string, token: string, body: object = {}) =>
    http().post(`/api/v1${path}`).auth(token, { type: 'bearer' }).send(body);

  beforeAll(async () => {
    ({ app, auth, content } = await createTestApp());

    const fundamentals = content.addSkill('fundamentals', 1);
    const testDesign = content.addSkill('test_design', 2);
    content.addSkill('automation', 3);

    basics = content.addCourse(fundamentals, 'basics');
    const m1 = content.addModule(basics, 'Module 1', { order_index: 1 });
    const m2 = content.addModule(basics, 'Module 2', { order_index: 2 });
    const draftModule = content.addModule(basics, 'Draft module', {
      order_index: 3,
      status: 'draft',
    });
    l1 = content.addLesson(m1, 'l1', { order_index: 1, estimated_minutes: 6 });
    draftLesson = content.addLesson(m1, 'draft-lesson', {
      order_index: 2,
      status: 'draft',
    });
    l2 = content.addLesson(m1, 'l2', { order_index: 3, estimated_minutes: 7 });
    l3 = content.addLesson(m2, 'l3', { order_index: 1, estimated_minutes: 8 });
    lessonInDraftModule = content.addLesson(draftModule, 'hidden');

    const design = content.addCourse(testDesign, 'design');
    d1 = content.addLesson(content.addModule(design, 'D1'), 'd1');

    const secret = content.addCourse(fundamentals, 'secret', {
      status: 'draft',
      order_index: 2,
    });
    lessonInDraftCourse = content.addLesson(
      content.addModule(secret, 'S1'),
      's1',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it.each([
      ['get', '/skills'],
      ['get', '/courses'],
      ['get', '/courses/basics'],
      ['get', `/lessons/${randomUUID()}`],
      ['post', `/lessons/${randomUUID()}/progress`],
      ['get', '/continue'],
    ] as const)('%s %s requires a token', async (method, path) => {
      const res = await http()[method](`/api/v1${path}`).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it('rejects a tampered token', async () => {
      const token = await signedIn();
      await get('/skills', `${token.slice(0, -4)}AAAA`).expect(401);
    });
  });

  describe('GET /skills', () => {
    it('lists skills in order', async () => {
      const token = await signedIn();
      const res = await get('/skills', token).expect(200);
      expect(res.body.map((s: { code: string }) => s.code)).toEqual([
        'fundamentals',
        'test_design',
        'automation',
      ]);
      expect(res.body[0]).toEqual({
        id: expect.any(String),
        code: 'fundamentals',
        name: 'Skill fundamentals',
        description: '',
        orderIndex: 1,
      });
    });
  });

  describe('GET /courses', () => {
    it('lists only published courses, with lesson totals and progress', async () => {
      const token = await signedIn();
      const res = await get('/courses', token).expect(200);

      expect(res.body.items.map((c: { slug: string }) => c.slug)).toEqual([
        'basics',
        'design',
      ]);
      expect(res.body.items[0]).toEqual({
        id: basics.id,
        slug: 'basics',
        title: 'Course basics',
        description: 'About basics',
        skill: { code: 'fundamentals', name: 'Skill fundamentals' },
        orderIndex: 1,
        estimatedMinutes: 21,
        progress: {
          totalLessons: 3,
          completedLessons: 0,
          status: 'not_started',
        },
      });
    });

    it('filters by skill code', async () => {
      const token = await signedIn();
      const res = await get('/courses?skill=test_design', token).expect(200);
      expect(res.body.items.map((c: { slug: string }) => c.slug)).toEqual([
        'design',
      ]);
    });

    it('returns an empty list for a skill without courses or an unknown skill', async () => {
      const token = await signedIn();
      await get('/courses?skill=automation', token).expect(200, emptyPage);
      await get('/courses?skill=no_such_skill', token).expect(200, emptyPage);
    });

    it('rejects an invalid skill code and unknown query parameters', async () => {
      const token = await signedIn();
      const bad = await get('/courses?skill=Not-A-Code', token).expect(400);
      expect(bad.body.details).toEqual([
        { field: 'skill', message: 'skill must be a skill code' },
      ]);
      await get('/courses?status=draft', token).expect(400);
    });

    it('reflects the learner progress', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {
        complete: true,
      }).expect(200);
      const res = await get('/courses', token).expect(200);
      expect(res.body.items[0].progress).toEqual({
        totalLessons: 3,
        completedLessons: 1,
        status: 'in_progress',
      });
    });
  });

  describe('GET /courses/:slug', () => {
    it('returns published modules and lessons in order, with progress', async () => {
      const token = await signedIn();
      const res = await get('/courses/basics', token).expect(200);

      expect(res.body.modules).toEqual([
        {
          id: expect.any(String),
          title: 'Module 1',
          description: '',
          lessons: [
            expect.objectContaining({
              id: l1.id,
              slug: 'l1',
              estimatedMinutes: 6,
            }),
            expect.objectContaining({ id: l2.id, slug: 'l2' }),
          ],
        },
        expect.objectContaining({
          title: 'Module 2',
          lessons: [expect.objectContaining({ id: l3.id })],
        }),
      ]);
      expect(res.body.modules[0].lessons[0].progress).toEqual({
        status: 'not_started',
        progressPercent: 0,
        startedAt: null,
        completedAt: null,
        lastAccessedAt: null,
      });
      expect(res.body.nextLessonId).toBe(l1.id);
    });

    it('points nextLessonId at the first unfinished lesson', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, { complete: true });
      const res = await get('/courses/basics', token).expect(200);
      expect(res.body.nextLessonId).toBe(l2.id);
      expect(res.body.modules[0].lessons[0].progress.status).toBe('completed');
    });

    it('404s for unknown and unpublished courses', async () => {
      const token = await signedIn();
      const missing = await get('/courses/nope', token).expect(404);
      expect(missing.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course not found',
      });
      await get('/courses/secret', token).expect(404);
    });
  });

  describe('GET /lessons/:id', () => {
    it('returns the content, its place in the course and neighbours', async () => {
      const token = await signedIn();
      const res = await get(`/lessons/${l2.id}`, token).expect(200);

      expect(res.body).toEqual({
        id: l2.id,
        slug: 'l2',
        title: 'Lesson l2',
        contentMd: l2.content_md,
        estimatedMinutes: 7,
        course: { id: basics.id, slug: 'basics', title: 'Course basics' },
        module: { id: l2.module_id, title: 'Module 1' },
        // The draft lesson between l1 and l2 is skipped.
        previousLesson: { id: l1.id, title: 'Lesson l1' },
        nextLesson: { id: l3.id, title: 'Lesson l3' },
        progress: expect.objectContaining({ status: 'not_started' }),
        language: 'en',
        translation: 'none',
      });
    });

    it('has no previous lesson at the start and no next at the end', async () => {
      const token = await signedIn();
      const first = await get(`/lessons/${l1.id}`, token).expect(200);
      expect(first.body.previousLesson).toBeNull();
      const last = await get(`/lessons/${l3.id}`, token).expect(200);
      expect(last.body.nextLesson).toBeNull();
    });

    it('rejects an invalid id with 400', async () => {
      const token = await signedIn();
      const res = await get('/lessons/not-a-uuid', token).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    });

    it.each([
      ['unknown', () => randomUUID()],
      ['draft', () => draftLesson.id],
      ['in a draft module', () => lessonInDraftModule.id],
      ['in a draft course', () => lessonInDraftCourse.id],
    ])('404s for a lesson that is %s', async (_label, id) => {
      const token = await signedIn();
      const res = await get(`/lessons/${id()}`, token).expect(404);
      expect(res.body.message).toBe('Lesson not found');
    });
  });

  describe('POST /lessons/:id/progress', () => {
    it('marks a lesson in progress when opened (empty body)', async () => {
      const token = await signedIn();
      const res = await post(`/lessons/${l1.id}/progress`, token).expect(200);
      expect(res.body).toEqual({
        status: 'in_progress',
        progressPercent: 0,
        startedAt: expect.any(String),
        completedAt: null,
        lastAccessedAt: expect.any(String),
      });
    });

    it('raises progress but never lowers it, and keeps the start time', async () => {
      const token = await signedIn();
      const first = await post(`/lessons/${l1.id}/progress`, token, {
        progressPercent: 60,
      }).expect(200);
      const lower = await post(`/lessons/${l1.id}/progress`, token, {
        progressPercent: 20,
      }).expect(200);
      expect(lower.body.progressPercent).toBe(60);
      expect(lower.body.startedAt).toBe(first.body.startedAt);

      const lesson = await get(`/lessons/${l1.id}`, token).expect(200);
      expect(lesson.body.progress.progressPercent).toBe(60);
    });

    it('completes a lesson, and it stays completed', async () => {
      const token = await signedIn();
      const done = await post(`/lessons/${l1.id}/progress`, token, {
        complete: true,
      }).expect(200);
      expect(done.body).toMatchObject({
        status: 'completed',
        progressPercent: 100,
        completedAt: expect.any(String),
      });

      const again = await post(`/lessons/${l1.id}/progress`, token, {
        complete: false,
        progressPercent: 10,
      }).expect(200);
      expect(again.body).toMatchObject({
        status: 'completed',
        progressPercent: 100,
        completedAt: done.body.completedAt,
      });
    });

    it('keeps progress per user', async () => {
      const alice = await signedIn();
      const bob = await signedIn();
      await post(`/lessons/${l1.id}/progress`, alice, { complete: true });

      const res = await get(`/lessons/${l1.id}`, bob).expect(200);
      expect(res.body.progress.status).toBe('not_started');
    });

    it.each([
      [{ progressPercent: 101 }, 'progressPercent'],
      [{ progressPercent: -1 }, 'progressPercent'],
      [{ progressPercent: 12.5 }, 'progressPercent'],
      [{ progressPercent: '50' }, 'progressPercent'],
      [{ complete: 'yes' }, 'complete'],
      [{ userId: randomUUID() }, 'userId'],
      [{ status: 'completed' }, 'status'],
    ])('rejects %j with 400', async (body, field) => {
      const token = await signedIn();
      const res = await post(`/lessons/${l1.id}/progress`, token, body).expect(
        400,
      );
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });

    it('404s for lessons the learner cannot see', async () => {
      const token = await signedIn();
      await post(`/lessons/${draftLesson.id}/progress`, token).expect(404);
      await post(`/lessons/${lessonInDraftCourse.id}/progress`, token).expect(
        404,
      );
      await post(`/lessons/${randomUUID()}/progress`, token).expect(404);
      await post('/lessons/nope/progress', token).expect(400);
    });
  });

  describe('GET /continue', () => {
    it('suggests the first lesson of the catalogue to a new learner', async () => {
      const token = await signedIn();
      const res = await get('/continue', token).expect(200);
      expect(res.body).toEqual({
        item: {
          reason: 'start',
          lessonId: l1.id,
          lessonTitle: 'Lesson l1',
          estimatedMinutes: 6,
          course: { id: basics.id, slug: 'basics', title: 'Course basics' },
          module: { id: l1.module_id, title: 'Module 1' },
          progress: expect.objectContaining({ status: 'not_started' }),
        },
        language: 'en',
        translation: 'none',
      });
    });

    it('resumes the lesson opened last', async () => {
      const token = await signedIn();
      await post(`/lessons/${l2.id}/progress`, token, { progressPercent: 40 });
      const res = await get('/continue', token).expect(200);
      expect(res.body.item).toMatchObject({
        reason: 'resume',
        lessonId: l2.id,
        progress: { status: 'in_progress', progressPercent: 40 },
      });
    });

    it('moves on after the last lesson was completed', async () => {
      const token = await signedIn();
      await post(`/lessons/${l2.id}/progress`, token, { complete: true });
      const res = await get('/continue', token).expect(200);
      expect(res.body.item).toMatchObject({ reason: 'next', lessonId: l1.id });
    });

    it('returns null when every lesson is completed', async () => {
      const token = await signedIn();
      for (const lesson of [l1, l2, l3, d1]) {
        await post(`/lessons/${lesson.id}/progress`, token, {
          complete: true,
        }).expect(200);
      }
      await get('/continue', token).expect(200, {
        item: null,
        language: 'en',
        translation: 'none',
      });
    });
  });
});
