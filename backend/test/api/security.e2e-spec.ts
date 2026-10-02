import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp, TestApp } from '../support/create-test-app.js';

/**
 * Phase 7 security sweeps. The route list is read from the app's own OpenAPI
 * document, so a route added later is checked without editing this file: it
 * must need a token (or be added to PUBLIC on purpose), reject bad tokens,
 * and answer 400 for a malformed id and 404 for an unknown one.
 */

type Method = 'get' | 'post' | 'patch' | 'delete';
interface RouteInfo {
  method: Method;
  path: string; // OpenAPI form: /api/v1/lessons/{id}
  params: string[];
}

/** The only routes reachable without a token. */
const PUBLIC = [
  'GET /api/v1/health',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/verify-email',
  'POST /api/v1/auth/resend-verification',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
];

const METHODS: Method[] = ['get', 'post', 'patch', 'delete'];
const label = (r: RouteInfo) => `${r.method.toUpperCase()} ${r.path}`;
const fill = (r: RouteInfo, value: (param: string) => string) =>
  r.path.replace(/\{(\w+)\}/g, (_, name: string) => value(name));

describe('Security sweeps (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;
  let routes: RouteInfo[];
  let learnerToken: string;
  let adminToken: string;
  let expiredToken: string;
  let seq = 0;

  const http = () => request(app.getHttpServer());
  const send = (method: Method, path: string, token?: string) => {
    const req = http()[method](path);
    return token ? req.auth(token, { type: 'bearer' }) : req;
  };

  async function user(role: 'learner' | 'admin') {
    const created = t.auth.createUser({
      email: `security-e2e${++seq}@example.com`,
      password: 'correct-horse-battery',
    });
    t.profiles.rows.get(created.id)!.role = role;
    return created.id;
  }

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    routes = Object.entries(document.paths).flatMap(([path, item]) =>
      METHODS.filter((m) => item[m]).map((method) => ({
        method,
        path,
        params: [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
      })),
    );

    const learnerId = await user('learner');
    learnerToken = await t.auth.signAccessToken(learnerId);
    expiredToken = await t.auth.signAccessToken(learnerId, { expiresIn: -60 });
    adminToken = await t.auth.signAccessToken(await user('admin'));
  });

  afterAll(async () => {
    await app.close();
  });

  const isPublic = (r: RouteInfo) => PUBLIC.includes(label(r));
  const protectedRoutes = () => routes.filter((r) => !isPublic(r));
  const tokenFor = (r: RouteInfo) =>
    r.path.startsWith('/api/v1/admin/') ? adminToken : learnerToken;

  it('reads the whole API from the OpenAPI document', () => {
    // Every public route exists, and the protected list is not empty: a
    // broken document would otherwise make the sweeps below pass vacuously.
    expect(routes.filter(isPublic).map(label).sort()).toEqual(
      [...PUBLIC].sort(),
    );
    expect(protectedRoutes().length).toBeGreaterThanOrEqual(40);
  });

  it('every route except the public ones is 401 without a token', async () => {
    const open: string[] = [];
    for (const r of protectedRoutes()) {
      const res = await send(
        r.method,
        fill(r, () => randomUUID()),
      );
      if (res.status !== 401) open.push(`${label(r)} → ${res.status}`);
      else
        expect(res.body).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
        });
    }
    expect(open).toEqual([]);
  });

  it('every protected route is 401 with an expired or tampered token', async () => {
    const [header, payload, signature] = learnerToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const tampered = [
      header,
      Buffer.from(JSON.stringify({ ...claims, sub: randomUUID() })).toString(
        'base64url',
      ),
      signature,
    ].join('.');

    const accepted: string[] = [];
    for (const r of protectedRoutes()) {
      for (const [name, token] of [
        ['expired', expiredToken],
        ['tampered', tampered],
      ]) {
        const res = await send(
          r.method,
          fill(r, () => randomUUID()),
          token,
        );
        if (res.status !== 401)
          accepted.push(`${name} ${label(r)} → ${res.status}`);
      }
    }
    expect(accepted).toEqual([]);
  });

  it('every id in a path is 400 when it is not a UUID', async () => {
    const withIds = protectedRoutes().filter((r) => r.params.length > 0);
    expect(withIds.length).toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const r of withIds) {
      // One malformed id at a time; the others are valid UUIDs.
      for (const bad of r.params.filter((p) => p !== 'slug')) {
        const path = fill(r, (p) => (p === bad ? 'not-a-uuid' : randomUUID()));
        const res = await send(r.method, path, tokenFor(r)).send({});
        if (res.status !== 400 || !/uuid/i.test(String(res.body.message)))
          wrong.push(
            `${label(r)} [${bad}] → ${res.status} ${res.body.message}`,
          );
      }
    }
    expect(wrong).toEqual([]);
  });

  it('every GET or DELETE of an unknown id is 404', async () => {
    const lookups = protectedRoutes().filter(
      (r) =>
        r.params.length > 0 && (r.method === 'get' || r.method === 'delete'),
    );
    expect(lookups.length).toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const r of lookups) {
      const res = await send(
        r.method,
        fill(r, (p) => (p === 'slug' ? 'no-such-course' : randomUUID())),
        tokenFor(r),
      );
      if (res.status !== 404) wrong.push(`${label(r)} → ${res.status}`);
    }
    expect(wrong).toEqual([]);
  });

  it('writes to an unknown lesson, exercise or attempt are 404', async () => {
    await send('post', `/api/v1/lessons/${randomUUID()}/progress`, learnerToken)
      .send({ complete: true })
      .expect(404);
    await send(
      'post',
      `/api/v1/exercises/${randomUUID()}/attempts`,
      learnerToken,
    )
      .send({ answer: { selected: ['a'] } })
      .expect(404);
    await send(
      'post',
      `/api/v1/exercises/${randomUUID()}/attempts/${randomUUID()}/self-assessment`,
      learnerToken,
    )
      .send({ checked: [] })
      .expect(404);
  });
});
