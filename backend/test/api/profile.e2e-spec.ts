import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Roles } from '../../src/auth/decorators/roles.decorator.js';
import {
  FakeAuthServer,
  FakeProfilesRepository,
} from '../support/fake-auth-server.js';
import { createTestApp } from '../support/create-test-app.js';

// Test-only admin route: checks RolesGuard on its own, apart from the admin CMS.
@Roles('admin')
@Controller('__test/admin')
class AdminOnlyController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({ controllers: [AdminOnlyController] })
class AdminOnlyModule {}

let seq = 0;

describe('Profile API (e2e)', () => {
  let app: INestApplication<App>;
  let auth: FakeAuthServer;
  let profiles: FakeProfilesRepository;

  const http = () => request(app.getHttpServer());

  async function signedIn(displayName = 'Minh') {
    const user = auth.createUser({
      email: `profile${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName,
    });
    return { user, token: await auth.signAccessToken(user.id) };
  }

  beforeAll(async () => {
    ({ app, auth, profiles } = await createTestApp({
      imports: [AdminOnlyModule],
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /me', () => {
    it('returns the profile of the token owner', async () => {
      const { user, token } = await signedIn();

      const res = await http()
        .get('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .expect(200);

      expect(res.body).toEqual({
        id: user.id,
        email: user.email,
        displayName: 'Minh',
        experienceLevel: null,
        learningGoals: [],
        role: 'learner',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('ignores a user id passed by the client', async () => {
      const { user, token } = await signedIn();
      const other = await signedIn('Other');

      const res = await http()
        .get('/api/v1/me')
        .query({ id: other.user.id })
        .auth(token, { type: 'bearer' })
        .expect(200);

      expect(res.body.id).toBe(user.id);
    });

    it('returns 404 when the profile row is missing', async () => {
      const { user, token } = await signedIn();
      profiles.rows.delete(user.id);

      await http()
        .get('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .expect(404);
    });

    it('requires authentication', async () => {
      await http().get('/api/v1/me').expect(401);
    });
  });

  describe('PATCH /me', () => {
    it('updates the allowed fields', async () => {
      const { token } = await signedIn();

      const res = await http()
        .patch('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .send({
          displayName: '  Minh Tran ',
          experienceLevel: 'some_qa',
          learningGoals: [
            ' Write better bug reports ',
            '',
            'Learn API testing',
          ],
        })
        .expect(200);

      expect(res.body).toMatchObject({
        displayName: 'Minh Tran',
        experienceLevel: 'some_qa',
        learningGoals: ['Write better bug reports', 'Learn API testing'],
      });
    });

    it('can clear the experience level', async () => {
      const { token } = await signedIn();
      await http()
        .patch('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .send({ experienceLevel: 'beginner' })
        .expect(200);

      const res = await http()
        .patch('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .send({ experienceLevel: null })
        .expect(200);

      expect(res.body.experienceLevel).toBeNull();
    });

    it('treats an empty body as a no-op', async () => {
      const { token } = await signedIn();

      const res = await http()
        .patch('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(200);

      expect(res.body.displayName).toBe('Minh');
    });

    it.each(['role', 'id', 'email', 'userId', 'createdAt'])(
      'rejects the protected field %s',
      async (field) => {
        const { user, token } = await signedIn();

        const res = await http()
          .patch('/api/v1/me')
          .auth(token, { type: 'bearer' })
          .send({ [field]: field === 'role' ? 'admin' : 'x' })
          .expect(400);

        expect(res.body.details).toEqual([expect.objectContaining({ field })]);
        expect(profiles.rows.get(user.id)?.role).toBe('learner');
      },
    );

    it.each([
      [{ displayName: '' }, 'displayName'],
      [{ displayName: null }, 'displayName'],
      [{ displayName: 'x'.repeat(81) }, 'displayName'],
      [{ experienceLevel: 'expert' }, 'experienceLevel'],
      [{ learningGoals: 'not-an-array' }, 'learningGoals'],
      [{ learningGoals: null }, 'learningGoals'],
      [
        { learningGoals: Array.from({ length: 11 }, (_, i) => `g${i}`) },
        'learningGoals',
      ],
      [{ learningGoals: ['x'.repeat(201)] }, 'learningGoals'],
      [{ learningGoals: [42] }, 'learningGoals'],
    ])('validates %j', async (body, field) => {
      const { token } = await signedIn();

      const res = await http()
        .patch('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .send(body)
        .expect(400);

      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });

    it('requires authentication', async () => {
      await http().patch('/api/v1/me').send({ displayName: 'X' }).expect(401);
    });
  });

  describe('RolesGuard', () => {
    it('returns 403 for a learner', async () => {
      const { token } = await signedIn();

      const res = await http()
        .get('/api/v1/__test/admin')
        .auth(token, { type: 'bearer' })
        .expect(403);

      expect(res.body.error).toBe('Forbidden');
    });

    it('allows an admin', async () => {
      const { user, token } = await signedIn();
      profiles.rows.get(user.id)!.role = 'admin';

      await http()
        .get('/api/v1/__test/admin')
        .auth(token, { type: 'bearer' })
        .expect(200, { ok: true });
    });

    it('does not trust a role claim inside the token', async () => {
      const { user } = await signedIn();
      const token = await auth.signAccessToken(user.id, {
        claims: { user_role: 'admin', app_metadata: { role: 'admin' } },
      });

      await http()
        .get('/api/v1/__test/admin')
        .auth(token, { type: 'bearer' })
        .expect(403);
    });

    it('returns 401 before 403 without a token', async () => {
      await http().get('/api/v1/__test/admin').expect(401);
    });
  });
});
