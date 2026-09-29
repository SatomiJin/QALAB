import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FakeAuthServer } from '../support/fake-auth-server.js';
import { createTestApp } from '../support/create-test-app.js';

const PASSWORD = 'correct-horse-battery';
let seq = 0;
const uniqueEmail = () => `learner${++seq}@example.com`;

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let auth: FakeAuthServer;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body?: object) =>
    http().post(`/api/v1/auth/${path}`).send(body);

  async function login(email: string, password = PASSWORD) {
    const res = await post('login', { email, password }).expect(200);
    return res.body as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
  }

  function verifiedUser(email = uniqueEmail()) {
    return auth.createUser({ email, password: PASSWORD, displayName: 'Minh' });
  }

  beforeAll(async () => {
    ({ app, auth } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    auth.down = false;
  });

  describe('POST /auth/register', () => {
    it('creates the account and sends a verification email', async () => {
      const email = uniqueEmail();

      const res = await post('register', {
        email,
        password: PASSWORD,
        displayName: '  Minh  ',
      }).expect(201);

      expect(res.body).toEqual({
        message: 'Check your email to verify your account.',
      });
      const mail = auth.lastEmail(email, 'signup');
      expect(mail?.redirectTo).toBe('http://localhost:5173/auth/verify');
      expect(auth.findUserByEmail(email)?.metadata).toEqual({
        display_name: 'Minh',
      });
    });

    it('answers the same way for an existing email (no enumeration)', async () => {
      const { email } = verifiedUser();
      const sentBefore = auth.sentEmails.length;

      const res = await post('register', {
        email,
        password: PASSWORD,
        displayName: 'Someone',
      }).expect(201);

      expect(res.body).toEqual({
        message: 'Check your email to verify your account.',
      });
      expect(auth.sentEmails).toHaveLength(sentBefore);
    });

    it('normalizes the email', async () => {
      await post('register', {
        email: '  Mixed.Case@Example.COM ',
        password: PASSWORD,
        displayName: 'Mixed',
      }).expect(201);

      expect(auth.findUserByEmail('mixed.case@example.com')).toBeDefined();
    });

    it.each([
      [
        'invalid email',
        { email: 'nope', password: PASSWORD, displayName: 'A' },
        'email',
      ],
      [
        'short password',
        { email: 'a@b.co', password: 'short', displayName: 'A' },
        'password',
      ],
      [
        'password over 72 chars',
        { email: 'a@b.co', password: 'x'.repeat(73), displayName: 'A' },
        'password',
      ],
      [
        'blank display name',
        { email: 'a@b.co', password: PASSWORD, displayName: '   ' },
        'displayName',
      ],
      [
        'long display name',
        { email: 'a@b.co', password: PASSWORD, displayName: 'x'.repeat(81) },
        'displayName',
      ],
      [
        'unknown field',
        {
          email: 'a@b.co',
          password: PASSWORD,
          displayName: 'A',
          role: 'admin',
        },
        'role',
      ],
    ])('rejects %s with 400', async (_case, body, field) => {
      const res = await post('register', body).expect(400);

      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });

    it('returns 503 when Supabase is unreachable', async () => {
      auth.down = true;

      const res = await post('register', {
        email: uniqueEmail(),
        password: PASSWORD,
        displayName: 'A',
      }).expect(503);

      expect(res.body.error).toBe('Service Unavailable');
    });
  });

  describe('POST /auth/verify-email', () => {
    async function registerAndGetHash() {
      const email = uniqueEmail();
      await post('register', {
        email,
        password: PASSWORD,
        displayName: 'A',
      }).expect(201);
      return { email, tokenHash: auth.lastEmail(email, 'signup')!.tokenHash };
    }

    it('verifies the email and returns a session', async () => {
      const { email, tokenHash } = await registerAndGetHash();

      const res = await post('verify-email', {
        tokenHash,
        type: 'email',
      }).expect(200);

      expect(res.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresAt: expect.any(Number),
        user: { id: expect.any(String), email, emailVerified: true },
      });
      await http()
        .get('/api/v1/me')
        .auth(res.body.accessToken, { type: 'bearer' })
        .expect(200);
    });

    it('accepts the legacy `signup` type', async () => {
      const { tokenHash } = await registerAndGetHash();

      await post('verify-email', { tokenHash, type: 'signup' }).expect(200);
    });

    it('rejects a token hash that was already used', async () => {
      const { tokenHash } = await registerAndGetHash();
      await post('verify-email', { tokenHash, type: 'email' }).expect(200);

      const res = await post('verify-email', {
        tokenHash,
        type: 'email',
      }).expect(400);
      expect(res.body.message).toBe(
        'Verification link is invalid or has expired',
      );
    });

    it('rejects an expired token hash', async () => {
      const { tokenHash } = await registerAndGetHash();
      auth.expireTokenHash(tokenHash);

      await post('verify-email', { tokenHash, type: 'email' }).expect(400);
    });

    it('rejects an unknown token hash', async () => {
      await post('verify-email', {
        tokenHash: 'deadbeef',
        type: 'email',
      }).expect(400);
    });

    it('rejects a recovery token used as a verification token', async () => {
      const { email } = verifiedUser();
      await post('forgot-password', { email }).expect(200);
      const { tokenHash } = auth.lastEmail(email, 'recovery')!;

      await post('verify-email', { tokenHash, type: 'email' }).expect(400);
    });

    it.each([
      [{ tokenHash: '', type: 'email' }, 'tokenHash'],
      [{ tokenHash: 'abc', type: 'recovery' }, 'type'],
      [{ type: 'email' }, 'tokenHash'],
    ])('validates the body %j', async (body, field) => {
      const res = await post('verify-email', body).expect(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('sends a new link to an unverified account', async () => {
      const email = uniqueEmail();
      auth.createUser({ email, password: PASSWORD, confirmed: false });

      await post('resend-verification', { email }).expect(200);

      expect(auth.lastEmail(email, 'signup')).toBeDefined();
    });

    it('returns the same 200 for unknown and verified emails', async () => {
      const unknown = await post('resend-verification', {
        email: uniqueEmail(),
      }).expect(200);
      const verified = await post('resend-verification', {
        email: verifiedUser().email,
      }).expect(200);

      expect(unknown.body).toEqual(verified.body);
    });

    it('returns 200 even when Supabase fails', async () => {
      auth.down = true;
      await post('resend-verification', { email: uniqueEmail() }).expect(200);
    });

    it('validates the email', async () => {
      await post('resend-verification', { email: 'nope' }).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns a session for valid credentials', async () => {
      const user = verifiedUser();

      const res = await post('login', {
        email: user.email.toUpperCase(),
        password: PASSWORD,
      }).expect(200);

      expect(res.body.user).toEqual({
        id: user.id,
        email: user.email,
        emailVerified: true,
      });
      expect(res.body.expiresAt).toBeGreaterThan(Date.now() / 1000);
    });

    it('returns the same generic 401 for a wrong password and an unknown email', async () => {
      const user = verifiedUser();

      const wrongPassword = await post('login', {
        email: user.email,
        password: 'wrong-password',
      }).expect(401);
      const unknownEmail = await post('login', {
        email: uniqueEmail(),
        password: PASSWORD,
      }).expect(401);

      expect(wrongPassword.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });

    it('returns 403 for an unverified email with the right password', async () => {
      const email = uniqueEmail();
      auth.createUser({ email, password: PASSWORD, confirmed: false });

      const res = await post('login', { email, password: PASSWORD }).expect(
        403,
      );

      expect(res.body.message).toBe('Email not verified');
    });

    it('does not reveal an unverified account behind a wrong password', async () => {
      const email = uniqueEmail();
      auth.createUser({ email, password: PASSWORD, confirmed: false });

      const res = await post('login', {
        email,
        password: 'wrong-password',
      }).expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('does not apply the password policy to login', async () => {
      // A short password must fail as bad credentials, not as a 400
      // that hints at the policy.
      await post('login', { email: uniqueEmail(), password: 'short' }).expect(
        401,
      );
    });

    it.each([
      [{ email: 'nope', password: PASSWORD }, 'email'],
      [{ email: 'a@b.co' }, 'password'],
      [{ email: 'a@b.co', password: '' }, 'password'],
    ])('validates the body %j', async (body, field) => {
      const res = await post('login', body).expect(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns a new session and rotates the refresh token', async () => {
      const { email } = verifiedUser();
      const session = await login(email);

      const res = await post('refresh', {
        refreshToken: session.refreshToken,
      }).expect(200);

      expect(res.body.refreshToken).not.toBe(session.refreshToken);
      await http()
        .get('/api/v1/me')
        .auth(res.body.accessToken, { type: 'bearer' })
        .expect(200);
      // The old refresh token was used up by the rotation.
      await post('refresh', { refreshToken: session.refreshToken }).expect(401);
    });

    it('rejects an unknown refresh token', async () => {
      const res = await post('refresh', { refreshToken: 'garbage' }).expect(
        401,
      );
      expect(res.body.message).toBe('Invalid or expired refresh token');
    });

    it('validates the body', async () => {
      await post('refresh', {}).expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session so its refresh token stops working', async () => {
      const { email } = verifiedUser();
      const session = await login(email);

      await post('logout')
        .auth(session.accessToken, { type: 'bearer' })
        .expect(204);

      await post('refresh', { refreshToken: session.refreshToken }).expect(401);
    });

    it('keeps other sessions of the same user signed in', async () => {
      const { email } = verifiedUser();
      const laptop = await login(email);
      const phone = await login(email);

      await post('logout')
        .auth(laptop.accessToken, { type: 'bearer' })
        .expect(204);

      await post('refresh', { refreshToken: phone.refreshToken }).expect(200);
    });

    it('succeeds when the session is already revoked', async () => {
      const { email } = verifiedUser();
      const session = await login(email);
      await post('logout')
        .auth(session.accessToken, { type: 'bearer' })
        .expect(204);

      await post('logout')
        .auth(session.accessToken, { type: 'bearer' })
        .expect(204);
    });

    it('requires an access token', async () => {
      await post('logout').expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('sends a reset link to an existing account', async () => {
      const { email } = verifiedUser();

      await post('forgot-password', { email }).expect(200);

      expect(auth.lastEmail(email, 'recovery')?.redirectTo).toBe(
        'http://localhost:5173/auth/reset-password',
      );
    });

    it('returns the same 200 for an unknown email', async () => {
      const known = await post('forgot-password', {
        email: verifiedUser().email,
      }).expect(200);
      const unknown = await post('forgot-password', {
        email: uniqueEmail(),
      }).expect(200);

      expect(unknown.body).toEqual(known.body);
    });

    it('returns 200 even when Supabase fails', async () => {
      auth.down = true;
      await post('forgot-password', { email: uniqueEmail() }).expect(200);
    });

    it('validates the email', async () => {
      await post('forgot-password', { email: 'nope' }).expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    async function recoveryHash(email: string) {
      await post('forgot-password', { email }).expect(200);
      return auth.lastEmail(email, 'recovery')!.tokenHash;
    }

    it('sets the new password and signs out every session', async () => {
      const { email } = verifiedUser();
      const oldSession = await login(email);
      const tokenHash = await recoveryHash(email);

      await post('reset-password', {
        tokenHash,
        newPassword: 'brand-new-password',
      }).expect(200);

      await post('login', { email, password: PASSWORD }).expect(401);
      await login(email, 'brand-new-password');
      await post('refresh', { refreshToken: oldSession.refreshToken }).expect(
        401,
      );
    });

    it('rejects an invalid or reused token hash', async () => {
      const { email } = verifiedUser();
      const tokenHash = await recoveryHash(email);
      await post('reset-password', {
        tokenHash,
        newPassword: 'brand-new-password',
      }).expect(200);

      const res = await post('reset-password', {
        tokenHash,
        newPassword: 'another-password',
      }).expect(400);
      expect(res.body.message).toBe('Reset link is invalid or has expired');
    });

    it('rejects a new password equal to the current one', async () => {
      const { email } = verifiedUser();
      const tokenHash = await recoveryHash(email);

      const res = await post('reset-password', {
        tokenHash,
        newPassword: PASSWORD,
      }).expect(400);
      expect(res.body.details).toEqual([
        expect.objectContaining({ field: 'newPassword' }),
      ]);
    });

    it('applies the password policy', async () => {
      const res = await post('reset-password', {
        tokenHash: 'abc',
        newPassword: 'short',
      }).expect(400);
      expect(res.body.details).toEqual([
        expect.objectContaining({ field: 'newPassword' }),
      ]);
    });
  });

  describe('POST /auth/change-password', () => {
    it('changes the password after checking the current one', async () => {
      const { email } = verifiedUser();
      const session = await login(email);

      await post('change-password', {
        currentPassword: PASSWORD,
        newPassword: 'brand-new-password',
      })
        .auth(session.accessToken, { type: 'bearer' })
        .expect(200);

      await post('login', { email, password: PASSWORD }).expect(401);
      await login(email, 'brand-new-password');
      // The current session stays valid.
      await post('refresh', { refreshToken: session.refreshToken }).expect(200);
    });

    it('rejects a wrong current password with 400 (not 401)', async () => {
      const { email } = verifiedUser();
      const session = await login(email);

      const res = await post('change-password', {
        currentPassword: 'wrong-password',
        newPassword: 'brand-new-password',
      })
        .auth(session.accessToken, { type: 'bearer' })
        .expect(400);

      expect(res.body.details).toEqual([
        expect.objectContaining({ field: 'currentPassword' }),
      ]);
    });

    it('rejects an unchanged password', async () => {
      const { email } = verifiedUser();
      const session = await login(email);

      await post('change-password', {
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
      })
        .auth(session.accessToken, { type: 'bearer' })
        .expect(400);
    });

    it('requires an access token', async () => {
      await post('change-password', {
        currentPassword: PASSWORD,
        newPassword: 'brand-new-password',
      }).expect(401);
    });
  });

  describe('access tokens', () => {
    const me = (token?: string) => {
      const req = http().get('/api/v1/me');
      return token ? req.set('Authorization', token) : req;
    };

    it('accepts a valid token', async () => {
      const { id } = verifiedUser();
      const token = await auth.signAccessToken(id);

      await me(`Bearer ${token}`).expect(200);
    });

    it('rejects a missing token', async () => {
      const res = await me().expect(401);
      expect(res.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing access token',
      });
    });

    it.each(['Basic abc', 'Bearer', 'Bearer a b', 'token'])(
      'rejects a malformed header %j',
      async (header) => {
        await me(header).expect(401);
      },
    );

    it('rejects an expired token', async () => {
      const { id } = verifiedUser();
      const token = await auth.signAccessToken(id, { expiresIn: -60 });

      const res = await me(`Bearer ${token}`).expect(401);
      expect(res.body.message).toBe('Invalid or expired access token');
    });

    it('rejects a token with a tampered payload', async () => {
      const victim = verifiedUser();
      const attacker = verifiedUser();
      const token = await auth.signAccessToken(attacker.id);
      const [header, , signature] = token.split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({
          sub: victim.id,
          email: victim.email,
          role: 'authenticated',
          aud: 'authenticated',
          iss: 'http://127.0.0.1:54321/auth/v1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString('base64url');

      await me(`Bearer ${header}.${forgedPayload}.${signature}`).expect(401);
    });

    it('rejects an unsigned (alg: none) token', async () => {
      const { id, email } = verifiedUser();
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
        sub: id,
        email,
        role: 'authenticated',
        aud: 'authenticated',
        iss: 'http://127.0.0.1:54321/auth/v1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })}.`;

      await me(`Bearer ${token}`).expect(401);
    });

    it('rejects a token from another issuer', async () => {
      const { id } = verifiedUser();
      const token = await auth.signAccessToken(id, {
        issuer: 'https://other-project.supabase.co/auth/v1',
      });

      await me(`Bearer ${token}`).expect(401);
    });

    it('rejects a token for a non-user role (e.g. anon key)', async () => {
      const { id } = verifiedUser();
      const token = await auth.signAccessToken(id, {
        claims: { role: 'anon' },
      });

      await me(`Bearer ${token}`).expect(401);
    });
  });
});
