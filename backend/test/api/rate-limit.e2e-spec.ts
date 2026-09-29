import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Config is validated when the app module is first imported, so the limit
// must be set before importing it (each spec file has its own module graph).
process.env.AUTH_RATE_LIMIT = '5';
const { createTestApp } = await import('../support/create-test-app.js');

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(['login', 'register', 'forgot-password'])(
    'returns 429 on /auth/%s after 5 requests per minute',
    async (path) => {
      const send = () =>
        request(app.getHttpServer())
          .post(`/api/v1/auth/${path}`)
          .send({ email: 'someone@example.com', password: 'wrong-password' });

      for (let i = 0; i < 5; i++) {
        const res = await send();
        expect(res.status).not.toBe(429);
      }

      const limited = await send().expect(429);
      expect(limited.body).toEqual({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests. Try again later.',
      });
      expect(limited.headers['retry-after']).toBeDefined();
    },
  );

  it('counts each endpoint separately', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'someone@example.com', password: 'x' });
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'someone@example.com' })
      .expect(200);
  });

  it('does not limit non-auth routes', async () => {
    for (let i = 0; i < 8; i++) {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });
});
