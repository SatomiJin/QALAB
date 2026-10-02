import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Config is validated when the app module is first imported, so the floor
// must be set before importing it (each spec file has its own module graph).
process.env.AUTH_MIN_RESPONSE_MS = '300';
const { createTestApp } = await import('../support/create-test-app.js');

const FLOOR = 300;
const PASSWORD = 'correct-horse-battery';

/**
 * Register, resend-verification and forgot-password answer no sooner than
 * AUTH_MIN_RESPONSE_MS, for known and unknown emails alike, so the time does
 * not reveal an account (test plan F4). Login is not slowed down.
 */
describe('Auth response floor (e2e)', () => {
  let app: INestApplication<App>;

  const timed = async (path: string, body: object) => {
    const started = performance.now();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/auth/${path}`)
      .send(body);
    return { res, ms: performance.now() - started };
  };

  beforeAll(async () => {
    const t = await createTestApp();
    app = t.app;
    t.auth.createUser({ email: 'verified@example.com', password: PASSWORD });
    t.auth.createUser({
      email: 'unverified@example.com',
      password: PASSWORD,
      confirmed: false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['register', 'verified@example.com', 201],
    ['register', 'new.person@example.com', 201],
    ['resend-verification', 'unverified@example.com', 200],
    ['resend-verification', 'nobody@example.com', 200],
    ['forgot-password', 'verified@example.com', 200],
    ['forgot-password', 'nobody@example.com', 200],
  ])('%s with %s waits for the floor', async (path, email, status) => {
    const body =
      path === 'register'
        ? { email, password: PASSWORD, displayName: 'Someone' }
        : { email };
    const { res, ms } = await timed(path, body);
    expect(res.status).toBe(status);
    // A small margin for timer resolution.
    expect(ms).toBeGreaterThanOrEqual(FLOOR - 5);
  });

  it('does not wait for a request the DTO rejects', async () => {
    const { res, ms } = await timed('register', {
      email: 'weak@example.com',
      password: 'short',
      displayName: 'Someone',
    });
    expect(res.status).toBe(400);
    // Rejected by the DTO before the service: no floor needed, nothing
    // about an account can leak from a malformed request.
    expect(ms).toBeLessThan(FLOOR);
  });

  it('does not slow down login', async () => {
    const ok = await timed('login', {
      email: 'verified@example.com',
      password: PASSWORD,
    });
    expect(ok.res.status).toBe(200);
    expect(ok.ms).toBeLessThan(FLOOR);
  });
});
