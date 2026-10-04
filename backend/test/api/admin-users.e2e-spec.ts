import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const PASSWORD = 'correct-horse-battery';
let seq = 0;

describe('Admin users API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;
  let adminId: string;
  let adminToken: string;
  let learnerToken: string;

  const http = () => request(app.getHttpServer());
  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    token = adminToken,
    body?: object,
  ) => {
    const req = http()
      [method](`/api/v1${path}`)
      .auth(token, { type: 'bearer' });
    return body ? req.send(body) : req;
  };
  const get = (path: string, token?: string) => call('get', path, token);
  const post = (path: string, token?: string) => call('post', path, token, {});
  const patch = (path: string, body: object, token?: string) =>
    call('patch', path, token, body);

  function user(
    role: 'learner' | 'admin' = 'learner',
    options: { confirmed?: boolean; name?: string } = {},
  ) {
    const created = t.auth.createUser({
      email: `users-e2e${++seq}@example.com`,
      password: PASSWORD,
      confirmed: options.confirmed,
      displayName: options.name ?? `${role} ${seq}`,
    });
    t.profiles.rows.get(created.id)!.role = role;
    return created;
  }

  const tokenFor = (id: string) => t.auth.signAccessToken(id);

  const login = (email: string) =>
    http().post('/api/v1/auth/login').send({ email, password: PASSWORD });

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    const admin = user('admin', { name: 'Root admin' });
    adminId = admin.id;
    adminToken = await tokenFor(admin.id);
    learnerToken = await tokenFor(user('learner').id);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('access', () => {
    const id = randomUUID();
    const routes: ['get' | 'post' | 'patch', string, object?][] = [
      ['get', '/admin/users'],
      ['get', `/admin/users/${id}`],
      ['patch', `/admin/users/${id}/role`, { role: 'admin' }],
      ['post', `/admin/users/${id}/disable`, {}],
      ['post', `/admin/users/${id}/enable`, {}],
    ];

    it.each(routes)('%s %s: 403 for a learner', async (method, path, body) => {
      const res = await call(method, path, learnerToken, body).expect(403);
      expect(res.body).toMatchObject({ statusCode: 403, error: 'Forbidden' });
    });

    it.each(routes)('%s %s: 401 without a token', async (method, path) => {
      await http()[method](`/api/v1${path}`).expect(401);
    });

    it('a learner cannot promote themselves (403 before validation)', async () => {
      const learner = user();
      const token = await tokenFor(learner.id);
      await patch(
        `/admin/users/${learner.id}/role`,
        { role: 'admin' },
        token,
      ).expect(403);
      expect(t.profiles.rows.get(learner.id)!.role).toBe('learner');
    });
  });

  describe('GET /admin/users', () => {
    it('lists users newest first with their status', async () => {
      const unverified = user('learner', { confirmed: false });
      const res = await get('/admin/users?pageSize=100').expect(200);

      expect(res.body).toMatchObject({ page: 1, pageSize: 100 });
      expect(res.body.total).toBeGreaterThanOrEqual(3);
      expect(res.body.items[0]).toMatchObject({
        id: unverified.id,
        email: unverified.email,
        role: 'learner',
        status: 'unverified',
        emailVerified: false,
        disabled: false,
        lastSignInAt: null,
        lessonsCompleted: 0,
        exercisesAttempted: 0,
      });
      const admin = res.body.items.find(
        (item: { id: string }) => item.id === adminId,
      );
      expect(admin).toMatchObject({ role: 'admin', status: 'active' });
    });

    it('searches email and display name, case-insensitively', async () => {
      const found = user('learner', { name: 'Zebra Tester' });
      const byName = await get('/admin/users?search=%20zebra%20').expect(200);
      expect(byName.body.items.map((u: { id: string }) => u.id)).toEqual([
        found.id,
      ]);

      const byEmail = await get(
        `/admin/users?search=${found.email.toUpperCase()}`,
      ).expect(200);
      expect(byEmail.body.total).toBe(1);
    });

    it('filters by role and status', async () => {
      const admins = await get('/admin/users?role=admin&pageSize=100').expect(
        200,
      );
      expect(
        admins.body.items.every((u: { role: string }) => u.role === 'admin'),
      ).toBe(true);

      const target = user();
      await post(`/admin/users/${target.id}/disable`).expect(200);
      const disabled = await get('/admin/users?status=disabled').expect(200);
      expect(disabled.body.items.map((u: { id: string }) => u.id)).toContain(
        target.id,
      );
      const active = await get(
        '/admin/users?status=active&pageSize=100',
      ).expect(200);
      expect(active.body.items.map((u: { id: string }) => u.id)).not.toContain(
        target.id,
      );
    });

    it('returns an empty page past the end with the real total', async () => {
      const res = await get('/admin/users?page=500').expect(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it.each([
      'pageSize=30',
      'page=0',
      'role=owner',
      'status=banned',
      `search=${'x'.repeat(101)}`,
      'userId=abc',
    ])('rejects %s with 400', async (query) => {
      await get(`/admin/users?${query}`).expect(400);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('shows profile, progress, recent attempts (no answers) and audit', async () => {
      const learner = user('learner', { name: 'Detail Learner' });
      const skill = t.content.addSkill(`skill_${++seq}`, 1);
      const course = t.content.addCourse(skill, `c-${seq}`);
      const mod = t.content.addModule(course, 'M');
      const lesson = t.content.addLesson(mod, `l-${seq}`);
      const exercise = t.exercises.add(
        lesson.id,
        'scenario',
        {},
        {
          question: 'Which boundaries?',
        },
      );
      const now = new Date().toISOString();
      await t.progress.upsert('', {
        user_id: learner.id,
        lesson_id: lesson.id,
        status: 'completed',
        progress_percent: 100,
        started_at: now,
        completed_at: now,
        last_accessed_at: now,
      });
      await t.attempts.insert({
        user_id: learner.id,
        exercise_id: exercise.id,
        answer: { text: 'secret answer of the learner' },
        score: 80,
        is_correct: true,
        feedback: { verdict: 'pass' } as never,
      });

      const res = await get(`/admin/users/${learner.id}`).expect(200);

      expect(res.body).toMatchObject({
        id: learner.id,
        displayName: 'Detail Learner',
        lessonsCompleted: 1,
        exercisesAttempted: 1,
        experienceLevel: null,
        learningGoals: [],
        auditLog: [],
      });
      expect(res.body.skills).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: skill.code,
            completedLessons: 1,
            percent: 100,
          }),
        ]),
      );
      expect(res.body.recentAttempts).toEqual([
        expect.objectContaining({
          exerciseId: exercise.id,
          exerciseType: 'scenario',
          question: 'Which boundaries?',
          lessonId: lesson.id,
          score: 80,
          isCorrect: true,
        }),
      ]);
      expect(JSON.stringify(res.body)).not.toContain('secret answer');
    });

    it('404 for an unknown user', async () => {
      await get(`/admin/users/${randomUUID()}`).expect(404);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('promotes a learner, then demotes them, with one audit row each', async () => {
      const target = user();
      const promoted = await patch(`/admin/users/${target.id}/role`, {
        role: 'admin',
      }).expect(200);
      expect(promoted.body.role).toBe('admin');
      expect(t.profiles.rows.get(target.id)!.role).toBe('admin');

      // Effective at once: the next request of the new admin passes RolesGuard.
      const token = await tokenFor(target.id);
      await get('/admin/users', token).expect(200);

      const demoted = await patch(`/admin/users/${target.id}/role`, {
        role: 'learner',
      }).expect(200);
      expect(demoted.body.role).toBe('learner');
      await get('/admin/users', token).expect(403);

      expect(demoted.body.auditLog).toEqual([
        expect.objectContaining({
          action: 'role_changed',
          from: 'admin',
          to: 'learner',
          actor: { id: adminId, displayName: 'Root admin' },
        }),
        expect.objectContaining({
          action: 'role_changed',
          from: 'learner',
          to: 'admin',
        }),
      ]);
    });

    it('the same role changes nothing and writes no audit row', async () => {
      const target = user();
      const res = await patch(`/admin/users/${target.id}/role`, {
        role: 'learner',
      }).expect(200);
      expect(res.body.auditLog).toEqual([]);
    });

    it('409 for your own role, so the last admin cannot be demoted', async () => {
      const res = await patch(`/admin/users/${adminId}/role`, {
        role: 'learner',
      }).expect(409);
      expect(res.body.message).toBe('You cannot change your own account here');
      expect(t.profiles.rows.get(adminId)!.role).toBe('admin');
    });

    it('409 when the database refuses in a race (self check in SQL)', async () => {
      const target = user();
      const original = t.adminUsers.setRole.bind(t.adminUsers);
      t.adminUsers.setRole = () =>
        Promise.reject({ code: 'P0001', message: 'x', hint: 'self' });
      try {
        await patch(`/admin/users/${target.id}/role`, { role: 'admin' }).expect(
          409,
        );
      } finally {
        t.adminUsers.setRole = original;
      }
    });

    it('409 when promoting a disabled account', async () => {
      const target = user();
      await post(`/admin/users/${target.id}/disable`).expect(200);
      const res = await patch(`/admin/users/${target.id}/role`, {
        role: 'admin',
      }).expect(409);
      expect(res.body.message).toBe(
        'Enable the account before making it an admin',
      );
    });

    it('validates the body and the id', async () => {
      const target = user();
      await patch(`/admin/users/${target.id}/role`, { role: 'owner' }).expect(
        400,
      );
      await patch(`/admin/users/${target.id}/role`, {}).expect(400);
      await patch(`/admin/users/${target.id}/role`, {
        role: 'admin',
        userId: adminId,
      }).expect(400);
      await patch('/admin/users/not-a-uuid/role', { role: 'admin' }).expect(
        400,
      );
      await patch(`/admin/users/${randomUUID()}/role`, {
        role: 'admin',
      }).expect(404);
    });
  });

  describe('disable / enable', () => {
    it('a disabled user cannot sign in or refresh; enable restores access', async () => {
      const target = user();
      const session = (await login(target.email).expect(200)).body as {
        refreshToken: string;
      };

      const disabled = await post(`/admin/users/${target.id}/disable`).expect(
        200,
      );
      expect(disabled.body).toMatchObject({
        disabled: true,
        status: 'disabled',
      });

      const refused = await login(target.email).expect(401);
      // Same answer as a wrong password: nothing about the account leaks.
      expect(refused.body.message).toBe('Invalid email or password');
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      const enabled = await post(`/admin/users/${target.id}/enable`).expect(
        200,
      );
      expect(enabled.body).toMatchObject({ disabled: false, status: 'active' });
      await login(target.email).expect(200);

      expect(
        enabled.body.auditLog.map((e: { action: string }) => e.action),
      ).toEqual(['enabled', 'disabled']);
      expect(enabled.body.auditLog[1]).toMatchObject({
        from: 'active',
        to: 'disabled',
      });
    });

    it('disabling twice writes one audit row', async () => {
      const target = user();
      await post(`/admin/users/${target.id}/disable`).expect(200);
      const again = await post(`/admin/users/${target.id}/disable`).expect(200);
      expect(again.body.auditLog).toHaveLength(1);
    });

    it('409 for yourself and for an admin', async () => {
      await post(`/admin/users/${adminId}/disable`).expect(409);
      const other = user('admin');
      const res = await post(`/admin/users/${other.id}/disable`).expect(409);
      expect(res.body.message).toBe(
        'Admins cannot be disabled: change the role to learner first',
      );
      expect(t.auth.isBanned(t.auth.users.get(other.id)!)).toBe(false);
    });

    it('503 when Supabase Auth is down, and nothing is logged', async () => {
      const target = user();
      t.auth.down = true;
      try {
        await post(`/admin/users/${target.id}/disable`).expect(503);
      } finally {
        t.auth.down = false;
      }
      const res = await get(`/admin/users/${target.id}`).expect(200);
      expect(res.body).toMatchObject({ disabled: false, auditLog: [] });
    });

    it('404 for an unknown user', async () => {
      await post(`/admin/users/${randomUUID()}/disable`).expect(404);
      await post(`/admin/users/${randomUUID()}/enable`).expect(404);
    });
  });
});
