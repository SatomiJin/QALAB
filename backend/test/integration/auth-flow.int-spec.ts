import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PASSWORD, TestUsers } from './support.js';

/**
 * The real backend against the real Supabase project: JWKS verification,
 * GoTrue error codes and RLS all run for real. Emails are never sent; token
 * hashes come from `auth.admin.generateLink`.
 */
describe('Auth flow (integration)', () => {
  const users = new TestUsers();
  let app: INestApplication<App>;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body?: object) =>
    http().post(`/api/v1/auth/${path}`).send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await users.cleanup();
    await app.close();
  });

  it('verify email → session → GET /me', async () => {
    const { email, tokenHash } = await users.signupLink('verify');

    const verified = await post('verify-email', {
      tokenHash,
      type: 'email',
    }).expect(200);
    expect(verified.body.user).toMatchObject({ email, emailVerified: true });

    const me = await http()
      .get('/api/v1/me')
      .auth(verified.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body).toMatchObject({
      email,
      displayName: 'IT verify',
      role: 'learner',
    });

    // The link works once.
    await post('verify-email', { tokenHash, type: 'email' }).expect(400);
  });

  it('login: generic 401 for wrong password, 403 for unverified email', async () => {
    const verified = await users.create('login');
    const unverified = await users.create('unverified', { confirmed: false });

    await post('login', { email: verified.email, password: 'wrong-pass-123' })
      .expect(401)
      .expect(({ body }) =>
        expect(body.message).toBe('Invalid email or password'),
      );
    await post('login', { email: unverified.email, password: PASSWORD })
      .expect(403)
      .expect(({ body }) => expect(body.message).toBe('Email not verified'));
    await post('login', {
      email: unverified.email,
      password: 'wrong-pass-123',
    }).expect(401);
  });

  it('refresh works; logout revokes the refresh token', async () => {
    const { email } = await users.create('logout');
    const { body: session } = await post('login', {
      email,
      password: PASSWORD,
    }).expect(200);

    const { body: refreshed } = await post('refresh', {
      refreshToken: session.refreshToken,
    }).expect(200);

    await post('logout')
      .auth(refreshed.accessToken, { type: 'bearer' })
      .expect(204);
    await post('refresh', { refreshToken: refreshed.refreshToken }).expect(401);
  });

  it('rejects a tampered access token', async () => {
    const { email } = await users.create('tamper');
    const { body } = await post('login', { email, password: PASSWORD });
    const [header, payload, signature] = body.accessToken.split('.');
    const flipped = signature.startsWith('A')
      ? `B${signature.slice(1)}`
      : `A${signature.slice(1)}`;

    await http()
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${header}.${payload}.${flipped}`)
      .expect(401);
  });

  it('reset password with a recovery link', async () => {
    const { email } = await users.create('reset');
    const tokenHash = await users.recoveryLink(email);

    await post('reset-password', {
      tokenHash,
      newPassword: 'reset-Pass-456',
    }).expect(200);

    await post('login', { email, password: PASSWORD }).expect(401);
    await post('login', { email, password: 'reset-Pass-456' }).expect(200);
  });

  it('change password checks the current password', async () => {
    const { email } = await users.create('change');
    const { body: session } = await post('login', {
      email,
      password: PASSWORD,
    }).expect(200);
    const authed = (path: string, body: object) =>
      post(path, body).auth(session.accessToken, { type: 'bearer' });

    await authed('change-password', {
      currentPassword: 'wrong-pass-123',
      newPassword: 'change-Pass-789',
    }).expect(400);
    await authed('change-password', {
      currentPassword: PASSWORD,
      newPassword: 'change-Pass-789',
    }).expect(200);

    await post('login', { email, password: 'change-Pass-789' }).expect(200);
  });

  it('PATCH /me updates the profile and rejects role', async () => {
    const { email } = await users.create('patch');
    const { body: session } = await post('login', {
      email,
      password: PASSWORD,
    }).expect(200);
    const patch = (body: object) =>
      http()
        .patch('/api/v1/me')
        .auth(session.accessToken, { type: 'bearer' })
        .send(body);

    await patch({ role: 'admin' }).expect(400);
    const { body } = await patch({
      displayName: 'Patched',
      experienceLevel: 'working_qa',
      learningGoals: ['Decision tables'],
    }).expect(200);

    expect(body).toMatchObject({
      displayName: 'Patched',
      experienceLevel: 'working_qa',
      learningGoals: ['Decision tables'],
      role: 'learner',
    });
  });
});
