import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Public } from '../../src/auth/decorators/public.decorator.js';
import { createTestApp } from '../support/create-test-app.js';

// Test-only endpoint to exercise the global validation pipe end to end.
class EchoDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@Public()
@Controller('__test')
class EchoController {
  @Post('echo')
  echo(@Body() body: EchoDto): EchoDto {
    return body;
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp({ imports: [EchoModule] }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
    });

    it('is not served without the version prefix', async () => {
      await request(app.getHttpServer()).get('/health').expect(404);
    });

    it('sets security headers', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('error format', () => {
    it('returns the standard shape for unknown routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/does-not-exist')
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: expect.any(String),
      });
    });

    it('returns 400 with field details for invalid bodies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/__test/echo')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    it('rejects unknown fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/__test/echo')
        .send({ email: 'a@b.com', password: 'long-enough', role: 'admin' })
        .expect(400);

      expect(res.body.details).toEqual([
        expect.objectContaining({ field: 'role' }),
      ]);
    });

    it('accepts a valid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/__test/echo')
        .send({ email: 'a@b.com', password: 'long-enough' })
        .expect(201, { email: 'a@b.com', password: 'long-enough' });
    });
  });

  describe('CORS', () => {
    it('allows the configured frontend origin', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
    });

    it('allows preview deployments matching the origin pattern', async () => {
      const origin = 'https://qalab-web-git-feature-x-team.vercel.app';
      const res = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it.each([
      // Look-alikes of a preview URL: another host, plain HTTP, another scope.
      'https://qalab-web-abc-team.vercel.app.evil.com',
      'http://qalab-web-abc-team.vercel.app',
      'https://qalab-web-abc-other.vercel.app',
      'https://evil-qalab-web-abc-team.vercel.app',
    ])('does not allow %s', async (origin) => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('does not allow other origins', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'https://evil.example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Swagger', () => {
    it('serves the OpenAPI document', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(res.body.info.title).toBe('QA Learning Lab API');
      expect(res.body.paths).toHaveProperty('/api/v1/health');
    });
  });
});
