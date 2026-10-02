import type { Page, Route } from '@playwright/test';
import { MockAdmin } from './mock-admin.ts';
import { MockDashboard } from './mock-dashboard.ts';
import { MockLearning } from './mock-learning.ts';
import { MockPractice } from './mock-practice.ts';

/**
 * Stateful stand-in for the backend API, installed with `page.route`. It
 * follows the real contract (docs/api.md): status codes, error shape,
 * single-use token hashes, refresh token rotation and revocation.
 */

interface MockUser {
  id: string;
  email: string;
  password: string;
  verified: boolean;
  displayName: string;
  role: 'learner' | 'admin';
  experienceLevel: string | null;
  learningGoals: string[];
}

export const PASSWORD = 'correct-horse-battery';

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}-${Date.now()}`;

function error(
  statusCode: number,
  error: string,
  message: string,
  details?: unknown[],
) {
  return {
    status: statusCode,
    json: { statusCode, error, message, ...(details ? { details } : {}) },
  };
}

export class MockApi {
  readonly users = new Map<string, MockUser>();
  readonly signupLinks = new Map<string, string>(); // tokenHash → email
  readonly recoveryLinks = new Map<string, string>();
  private readonly accessTokens = new Map<string, string>(); // token → email
  private readonly refreshTokens = new Map<string, string>();
  /** Every request the app made, for assertions. */
  readonly calls: { method: string; path: string }[] = [];
  healthy = true;
  readonly learning = new MockLearning();
  readonly practice = new MockPractice();
  readonly admin = new MockAdmin();
  readonly dashboard = new MockDashboard(this.learning, this.practice);

  constructor() {
    // Like the backend: what an admin publishes is what learners see.
    this.learning.publishedCourses = () => this.admin.learnerCourses();
  }

  addUser(input: Partial<MockUser> & { email: string }): MockUser {
    const user: MockUser = {
      id: nextId('user'),
      password: PASSWORD,
      verified: true,
      displayName: 'Minh Tran',
      role: 'learner',
      experienceLevel: null,
      learningGoals: [],
      ...input,
    };
    this.users.set(user.email, user);
    return user;
  }

  /** Signs the user in "from a previous visit": only a refresh token is stored. */
  async signIn(page: Page, user: MockUser): Promise<void> {
    const refreshToken = nextId('refresh');
    this.refreshTokens.set(refreshToken, user.email);
    await page.addInitScript((token) => {
      if (!sessionStorage.getItem('qalab.e2e.seeded')) {
        localStorage.setItem('qalab.refreshToken', token);
        sessionStorage.setItem('qalab.e2e.seeded', '1');
      }
    }, refreshToken);
  }

  signupLinkFor(email: string): string | undefined {
    return [...this.signupLinks].find(([, e]) => e === email)?.[0];
  }

  recoveryLinkFor(email: string): string | undefined {
    return [...this.recoveryLinks].find(([, e]) => e === email)?.[0];
  }

  revokeAllSessions(): void {
    this.accessTokens.clear();
    this.refreshTokens.clear();
  }

  private session(user: MockUser) {
    const accessToken = nextId('access');
    const refreshToken = nextId('refresh');
    this.accessTokens.set(accessToken, user.email);
    this.refreshTokens.set(refreshToken, user.email);
    return {
      accessToken,
      refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { id: user.id, email: user.email, emailVerified: user.verified },
    };
  }

  private profile(user: MockUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      experienceLevel: user.experienceLevel,
      learningGoals: user.learningGoals,
      role: user.role,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    };
  }

  private currentUser(route: Route): MockUser | undefined {
    const header = route.request().headers().authorization ?? '';
    const email = this.accessTokens.get(header.replace(/^Bearer /, ''));
    return email ? this.users.get(email) : undefined;
  }

  async install(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '');
      this.calls.push({ method: request.method(), path });
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const result = this.handle(request.method(), path, body, route);
      if (result === 'abort') return route.abort('connectionrefused');
      return route.fulfill(
        result.status === 204
          ? { status: 204 }
          : { status: result.status, json: result.json },
      );
    });
  }

  private handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    route: Route,
  ): { status: number; json?: unknown } | 'abort' {
    const key = `${method} ${path}`;
    const email =
      typeof body.email === 'string' ? body.email.toLowerCase() : '';
    const unauthorized = error(
      401,
      'Unauthorized',
      'Invalid or expired access token',
    );

    switch (key) {
      case 'GET /health':
        return this.healthy
          ? {
              status: 200,
              json: {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptimeSeconds: 1,
              },
            }
          : 'abort';

      case 'POST /auth/register': {
        if (!this.users.has(email)) {
          this.addUser({
            email,
            password: String(body.password),
            verified: false,
            displayName: String(body.displayName),
          });
          this.signupLinks.set(nextId('signup'), email);
        }
        return {
          status: 201,
          json: { message: 'Check your email to verify your account.' },
        };
      }

      case 'POST /auth/verify-email': {
        const target = this.signupLinks.get(String(body.tokenHash));
        const user = target && this.users.get(target);
        if (!user)
          return error(
            400,
            'Bad Request',
            'Verification link is invalid or has expired',
          );
        this.signupLinks.delete(String(body.tokenHash));
        user.verified = true;
        return { status: 200, json: this.session(user) };
      }

      case 'POST /auth/resend-verification': {
        const user = this.users.get(email);
        if (user && !user.verified)
          this.signupLinks.set(nextId('signup'), email);
        return { status: 200, json: { message: 'sent' } };
      }

      case 'POST /auth/login': {
        const user = this.users.get(email);
        if (!user || user.password !== body.password) {
          return error(401, 'Unauthorized', 'Invalid email or password');
        }
        if (!user.verified)
          return error(403, 'Forbidden', 'Email not verified');
        return { status: 200, json: this.session(user) };
      }

      case 'POST /auth/refresh': {
        const token = String(body.refreshToken);
        const owner = this.refreshTokens.get(token);
        const user = owner && this.users.get(owner);
        if (!user)
          return error(401, 'Unauthorized', 'Invalid or expired refresh token');
        this.refreshTokens.delete(token);
        return { status: 200, json: this.session(user) };
      }

      case 'POST /auth/logout': {
        const header = route.request().headers().authorization ?? '';
        const owner = this.accessTokens.get(header.replace(/^Bearer /, ''));
        if (!owner) return unauthorized;
        for (const [token, e] of this.refreshTokens)
          if (e === owner) this.refreshTokens.delete(token);
        for (const [token, e] of this.accessTokens)
          if (e === owner) this.accessTokens.delete(token);
        return { status: 204 };
      }

      case 'POST /auth/forgot-password': {
        if (this.users.has(email))
          this.recoveryLinks.set(nextId('recovery'), email);
        return { status: 200, json: { message: 'sent' } };
      }

      case 'POST /auth/reset-password': {
        const target = this.recoveryLinks.get(String(body.tokenHash));
        const user = target && this.users.get(target);
        if (!user)
          return error(
            400,
            'Bad Request',
            'Reset link is invalid or has expired',
          );
        this.recoveryLinks.delete(String(body.tokenHash));
        user.password = String(body.newPassword);
        return {
          status: 200,
          json: { message: 'Your password has been reset.' },
        };
      }

      case 'POST /auth/change-password': {
        const user = this.currentUser(route);
        if (!user) return unauthorized;
        if (body.currentPassword !== user.password) {
          return error(400, 'Bad Request', 'Current password is incorrect', [
            {
              field: 'currentPassword',
              message: 'currentPassword is incorrect',
            },
          ]);
        }
        user.password = String(body.newPassword);
        return {
          status: 200,
          json: { message: 'Your password has been changed.' },
        };
      }

      case 'GET /me': {
        const user = this.currentUser(route);
        return user ? { status: 200, json: this.profile(user) } : unauthorized;
      }

      case 'PATCH /me': {
        const user = this.currentUser(route);
        if (!user) return unauthorized;
        if (typeof body.displayName === 'string')
          user.displayName = body.displayName;
        if (body.experienceLevel !== undefined)
          user.experienceLevel = body.experienceLevel as string | null;
        if (Array.isArray(body.learningGoals))
          user.learningGoals = body.learningGoals as string[];
        return { status: 200, json: this.profile(user) };
      }

      default: {
        const user = this.currentUser(route);
        if (!user) return unauthorized;
        const query = new URL(route.request().url()).searchParams;
        return (
          this.admin.handle(method, path, body, user.role, query) ??
          this.learning.handle(method, path, body, user.id, query) ??
          this.practice.handle(method, path, body, user.id, query) ??
          this.dashboard.handle(method, path, user.id, query) ??
          error(404, 'Not Found', `Cannot ${method} ${path}`)
        );
      }
    }
  }
}

/** Installs the mock API; returns it for setup and assertions. */
export async function mockApi(page: Page): Promise<MockApi> {
  const api = new MockApi();
  await api.install(page);
  return api;
}

/** Mock API with a signed-in learner (or admin). */
export async function signedIn(
  page: Page,
  options: { role?: 'learner' | 'admin'; email?: string } = {},
) {
  const api = await mockApi(page);
  const user = api.addUser({
    email: options.email ?? `learner${++counter}@example.com`,
    role: options.role ?? 'learner',
  });
  await api.signIn(page, user);
  return { api, user };
}

/** Below the lg breakpoint (992px) the main links live in a drawer. */
export async function openNav(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1280) < 992) {
    await page.getByRole('button', { name: /Open navigation|Mở menu/ }).click();
  }
}

/** Language and theme switchers sit in the nav drawer on phones. */
export async function openPreferences(page: Page): Promise<void> {
  const language = page.getByRole('button', { name: /^(Language|Ngôn ngữ)/ });
  if (!(await language.isVisible())) await openNav(page);
}
