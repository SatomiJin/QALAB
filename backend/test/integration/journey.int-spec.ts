import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PASSWORD, serviceClient, TestUsers } from './support.js';

/**
 * Phase 7 end-to-end journey (plant.md › Important E2E flows) through the real
 * backend and the real Supabase project: auth, RLS, triggers and views all run
 * for real, so "progress persisted" means stored in Postgres.
 *
 * The steps share state and run in order. Registration uses
 * `auth.admin.generateLink` (the same user the register endpoint creates,
 * without sending an email); `POST /auth/register` itself is covered by
 * test/api/auth.e2e-spec.ts.
 */
describe('Learner and admin journey (integration)', () => {
  const users = new TestUsers();
  const admin = serviceClient();
  const slug = `qalab-it-journey-${randomBytes(4).toString('hex')}`;
  let app: INestApplication<App>;
  let courseId: string | undefined;

  const state = {
    email: '',
    accessToken: '',
    refreshToken: '',
    adminToken: '',
    lessonId: '',
    exerciseId: '',
  };

  const http = () => request(app.getHttpServer());
  const get = (path: string, token: string) =>
    http().get(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const post = (path: string, token: string, body?: object) =>
    http().post(`/api/v1${path}`).auth(token, { type: 'bearer' }).send(body);
  const login = (email: string) =>
    http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    const adminUser = await users.create('journey-admin');
    await users.setRole(adminUser.id, 'admin');
    state.adminToken = (await login(adminUser.email)).body.accessToken;
  });

  afterAll(async () => {
    // Users first: their progress and attempts cascade, so the course
    // (restrict foreign keys) can then be deleted.
    await users.cleanup();
    await app.close();
    if (courseId) {
      // A failed delete would leave a published course real learners see.
      const { error } = await admin.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    }
  });

  it('1. register: the email link verifies the account and signs in', async () => {
    const { email, tokenHash } = await users.signupLink('journey');
    state.email = email;
    const res = await http()
      .post('/api/v1/auth/verify-email')
      .send({ tokenHash, type: 'email' })
      .expect(200);
    expect(res.body.user).toMatchObject({ email, emailVerified: true });
  });

  it('2. login', async () => {
    const res = await login(state.email);
    state.accessToken = res.body.accessToken;
    state.refreshToken = res.body.refreshToken;
    const me = await get('/me', state.accessToken).expect(200);
    expect(me.body).toMatchObject({ email: state.email, role: 'learner' });
  });

  it('10. admin creates a course and publishes it, then the learner sees it', async () => {
    const { data: skill } = await admin
      .from('skills')
      .select('id')
      .eq('code', 'fundamentals')
      .single<{ id: string }>();
    const course = await post('/admin/courses', state.adminToken, {
      skillId: skill!.id,
      title: 'Journey course',
      slug,
    }).expect(201);
    courseId = course.body.id as string;
    const mod = await post(
      `/admin/courses/${courseId}/modules`,
      state.adminToken,
      {
        title: 'Journey module',
        status: 'published',
      },
    ).expect(201);
    const lesson = await post(
      `/admin/modules/${mod.body.id}/lessons`,
      state.adminToken,
      {
        title: 'Journey lesson',
        slug: 'journey-lesson',
        contentMd: '## Boundary values\n\nTest the edges of every range.',
        status: 'published',
      },
    ).expect(201);
    state.lessonId = lesson.body.id;
    const exercise = await post(
      `/admin/lessons/${state.lessonId}/exercises`,
      state.adminToken,
      {
        type: 'multiple_choice',
        question: 'Which technique tests the edges of a range?',
        promptData: {
          options: [
            { id: 'a', text: 'Boundary value analysis' },
            { id: 'b', text: 'Exploratory testing' },
          ],
          multiple: false,
        },
        answerData: { correct: ['a'] },
        explanation: 'Boundaries.',
        status: 'published',
      },
    ).expect(201);
    state.exerciseId = exercise.body.id;

    // Still a draft course: invisible to the learner.
    await get(`/courses/${slug}`, state.accessToken).expect(404);
    await get(`/lessons/${state.lessonId}`, state.accessToken).expect(404);

    await post(`/admin/courses/${courseId}/publish`, state.adminToken).expect(
      200,
    );

    const list = await get(
      '/courses?skill=fundamentals&pageSize=100',
      state.accessToken,
    ).expect(200);
    expect(list.body.items.map((c: { slug: string }) => c.slug)).toContain(
      slug,
    );
    const detail = await get(`/courses/${slug}`, state.accessToken).expect(200);
    expect(detail.body.progress).toMatchObject({
      totalLessons: 1,
      completedLessons: 0,
      status: 'not_started',
    });
  });

  it('3. open lesson: the visit is recorded', async () => {
    const lesson = await get(
      `/lessons/${state.lessonId}`,
      state.accessToken,
    ).expect(200);
    expect(lesson.body.title).toBe('Journey lesson');
    const visit = await post(
      `/lessons/${state.lessonId}/progress`,
      state.accessToken,
      {},
    ).expect(200);
    expect(visit.body).toMatchObject({
      status: 'in_progress',
      progressPercent: 0,
    });
  });

  it('4. complete lesson', async () => {
    const res = await post(
      `/lessons/${state.lessonId}/progress`,
      state.accessToken,
      {
        complete: true,
      },
    ).expect(200);
    expect(res.body).toMatchObject({
      status: 'completed',
      progressPercent: 100,
    });
    expect(res.body.completedAt).toEqual(expect.any(String));
  });

  it('5. submit quiz: graded on the backend, no answer key before the attempt', async () => {
    const exercise = await get(
      `/exercises/${state.exerciseId}`,
      state.accessToken,
    ).expect(200);
    expect(JSON.stringify(exercise.body)).not.toMatch(/"correct"|Boundaries\./);

    const res = await post(
      `/exercises/${state.exerciseId}/attempts`,
      state.accessToken,
      {
        answer: { selected: ['a'] },
      },
    ).expect(201);
    expect(res.body.attempt).toMatchObject({ score: 100, isCorrect: true });
    expect(res.body.review.explanation).toBe('Boundaries.');
  });

  it('6. verify progress: course, dashboard and progress page', async () => {
    const course = await get(`/courses/${slug}`, state.accessToken).expect(200);
    expect(course.body.progress).toMatchObject({
      completedLessons: 1,
      status: 'completed',
    });

    const dashboard = await get('/dashboard?tz=UTC', state.accessToken).expect(
      200,
    );
    const fundamentals = dashboard.body.skills.find(
      (s: { code: string }) => s.code === 'fundamentals',
    );
    expect(fundamentals.completedLessons).toBe(1);
    expect(fundamentals.exercises).toMatchObject({
      attempted: 1,
      passed: 1,
      averageScore: 100,
    });
    expect(dashboard.body.streak).toMatchObject({
      current: 1,
      activeToday: true,
    });
    const kinds = dashboard.body.recentActivity.map(
      (a: { kind: string }) => a.kind,
    );
    expect(kinds).toEqual(
      expect.arrayContaining(['exercise_attempted', 'lesson_completed']),
    );

    const progress = await get(
      '/progress?skill=fundamentals&pageSize=100',
      state.accessToken,
    ).expect(200);
    const mine = progress.body.items.find(
      (c: { slug: string }) => c.slug === slug,
    );
    const lesson = mine.modules[0].lessons[0];
    expect(lesson.progress.status).toBe('completed');
    expect(lesson.exercises[0].stats).toMatchObject({
      attemptCount: 1,
      bestScore: 100,
      passed: true,
    });
  });

  it('7. logout: the refresh token cannot be used again', async () => {
    await post('/auth/logout', state.accessToken).expect(204);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: state.refreshToken })
      .expect(401);
  });

  it('8–9. login again: the progress and the attempt are still there', async () => {
    const res = await login(state.email);
    const token = res.body.accessToken as string;

    const course = await get(`/courses/${slug}`, token).expect(200);
    expect(course.body.progress).toMatchObject({
      completedLessons: 1,
      status: 'completed',
    });
    const lesson = course.body.modules[0].lessons[0];
    expect(lesson.progress).toMatchObject({
      status: 'completed',
      progressPercent: 100,
    });

    const attempts = await get(
      `/exercises/${state.exerciseId}/attempts`,
      token,
    ).expect(200);
    expect(attempts.body.total).toBe(1);
    expect(attempts.body.items[0]).toMatchObject({
      score: 100,
      isCorrect: true,
    });
  });
});
