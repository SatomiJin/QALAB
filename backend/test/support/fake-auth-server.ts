import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  createLocalJWKSet,
  decodeJwt,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTVerifyGetKey,
} from 'jose';
import type {
  ProfilePatch,
  ProfileRow,
} from '../../src/profile/profiles.repository.js';

/**
 * In-memory stand-in for Supabase Auth (GoTrue), covering the calls the
 * backend makes. It issues real ES256 JWTs, so the backend's JWT
 * verification runs for real in API tests. Behaviour mirrors GoTrue where
 * it matters for security (password checked before confirmation, revoked
 * refresh tokens, generic errors).
 */

export const TEST_SUPABASE_URL = 'http://127.0.0.1:54321';
const ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
const KID = 'test-key';

interface FakeUser {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
  metadata: Record<string, unknown>;
}

interface TokenHash {
  userId: string;
  type: 'signup' | 'recovery';
  expiresAt: number;
}

export interface SentEmail {
  to: string;
  type: 'signup' | 'recovery';
  tokenHash: string;
  redirectTo: string | undefined;
}

interface FakeSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    user_metadata: Record<string, unknown>;
  };
}

type Result<T> = Promise<
  | { data: T; error: null }
  | { data: never; error: AuthApiError | AuthRetryableFetchError }
>;

const apiError = (message: string, status: number, code: string) =>
  new AuthApiError(message, status, code);

export class FakeAuthServer {
  readonly users = new Map<string, FakeUser>();
  readonly sentEmails: SentEmail[] = [];
  /** Simulates a Supabase outage for every call while set. */
  down = false;
  /** Seconds until issued access tokens expire. */
  accessTokenTtl = 3600;

  private readonly tokenHashes = new Map<string, TokenHash>();
  private readonly refreshTokens = new Map<
    string,
    { sessionId: string; used: boolean }
  >();
  private readonly sessions = new Map<
    string,
    { userId: string; revoked: boolean }
  >();

  private constructor(
    private readonly privateKey: CryptoKey,
    readonly keySet: JWTVerifyGetKey,
    readonly onUserCreated: (user: FakeUser) => void,
  ) {}

  static async create(onUserCreated: (user: FakeUser) => void = () => {}) {
    const { privateKey, publicKey } = await generateKeyPair('ES256', {
      extractable: true,
    });
    const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'ES256' };
    return new FakeAuthServer(
      privateKey,
      createLocalJWKSet({ keys: [jwk] }),
      onUserCreated,
    );
  }

  // --- Test helpers --------------------------------------------------------

  createUser(input: {
    email: string;
    password: string;
    confirmed?: boolean;
    displayName?: string;
  }): FakeUser {
    const user: FakeUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      password: input.password,
      confirmed: input.confirmed ?? true,
      metadata: input.displayName ? { display_name: input.displayName } : {},
    };
    this.users.set(user.id, user);
    this.onUserCreated(user);
    return user;
  }

  findUserByEmail(email: string): FakeUser | undefined {
    return [...this.users.values()].find(
      (u) => u.email === email.toLowerCase(),
    );
  }

  lastEmail(to: string, type: SentEmail['type']): SentEmail | undefined {
    return this.sentEmails.filter((e) => e.to === to && e.type === type).at(-1);
  }

  expireTokenHash(tokenHash: string): void {
    const entry = this.tokenHashes.get(tokenHash);
    if (entry) entry.expiresAt = 0;
  }

  /** Signs a token with the test key. `overrides` can break any claim. */
  async signAccessToken(
    userId: string,
    options: {
      sessionId?: string;
      expiresIn?: number;
      claims?: Record<string, unknown>;
      issuer?: string;
    } = {},
  ): Promise<string> {
    const user = this.users.get(userId);
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      email: user?.email,
      role: 'authenticated',
      session_id: options.sessionId ?? randomUUID(),
      ...options.claims,
    })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setSubject(userId)
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience('authenticated')
      .setIssuedAt(now)
      .setExpirationTime(now + (options.expiresIn ?? this.accessTokenTtl))
      .sign(this.privateKey);
  }

  /** A fresh client, like `createClient(url, key)` on the backend. */
  client(): { auth: FakeAuthClient } {
    return { auth: new FakeAuthClient(this) };
  }

  // --- Internals used by FakeAuthClient ------------------------------------

  guard(): AuthRetryableFetchError | null {
    return this.down ? new AuthRetryableFetchError('fetch failed', 0) : null;
  }

  issueTokenHash(user: FakeUser, type: TokenHash['type'], redirectTo?: string) {
    const tokenHash = randomBytes(24).toString('hex');
    this.tokenHashes.set(tokenHash, {
      userId: user.id,
      type,
      expiresAt: Date.now() + 3600_000,
    });
    this.sentEmails.push({ to: user.email, type, tokenHash, redirectTo });
  }

  consumeTokenHash(tokenHash: string, type: string): FakeUser | null {
    const entry = this.tokenHashes.get(tokenHash);
    const expected = type === 'recovery' ? 'recovery' : 'signup';
    if (!entry || entry.type !== expected || entry.expiresAt < Date.now()) {
      return null;
    }
    this.tokenHashes.delete(tokenHash);
    return this.users.get(entry.userId) ?? null;
  }

  async startSession(user: FakeUser): Promise<FakeSession> {
    const sessionId = randomUUID();
    this.sessions.set(sessionId, { userId: user.id, revoked: false });
    return this.sessionFor(user, sessionId);
  }

  private async sessionFor(
    user: FakeUser,
    sessionId: string,
  ): Promise<FakeSession> {
    const refreshToken = randomBytes(16).toString('hex');
    this.refreshTokens.set(refreshToken, { sessionId, used: false });
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: await this.signAccessToken(user.id, { sessionId }),
      refresh_token: refreshToken,
      expires_in: this.accessTokenTtl,
      expires_at: now + this.accessTokenTtl,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.confirmed ? new Date().toISOString() : null,
        user_metadata: user.metadata,
      },
    };
  }

  async rotateRefreshToken(token: string): Promise<FakeSession | null> {
    const entry = this.refreshTokens.get(token);
    const session = entry && this.sessions.get(entry.sessionId);
    if (!entry || entry.used || !session || session.revoked) return null;
    entry.used = true;
    const user = this.users.get(session.userId);
    return user ? this.sessionFor(user, entry.sessionId) : null;
  }

  /** Resolves the session from an access token, like GoTrue's /logout. */
  sessionFromJwt(jwt: string): { userId: string; sessionId: string } | null {
    try {
      const claims = decodeJwt(jwt);
      const sessionId = String(claims.session_id);
      const session = this.sessions.get(sessionId);
      return session && !session.revoked
        ? { userId: session.userId, sessionId }
        : null;
    } catch {
      return null;
    }
  }

  revoke(sessionId: string, scope: 'local' | 'global' | 'others'): void {
    const current = this.sessions.get(sessionId);
    if (!current) return;
    for (const [id, session] of this.sessions) {
      const sameUser = session.userId === current.userId;
      if (
        (scope === 'local' && id === sessionId) ||
        (scope === 'global' && sameUser) ||
        (scope === 'others' && sameUser && id !== sessionId)
      ) {
        session.revoked = true;
      }
    }
  }
}

/** Subset of `SupabaseClient['auth']` used by the backend. */
export class FakeAuthClient {
  private session: FakeSession | null = null;

  readonly admin = {
    signOut: async (
      jwt: string,
      scope: 'local' | 'global' | 'others' = 'global',
    ): Result<null> => {
      const down = this.server.guard();
      if (down) return { data: null as never, error: down };
      const found = this.server.sessionFromJwt(jwt);
      if (!found) {
        return {
          data: null as never,
          error: apiError('Session not found', 404, 'session_not_found'),
        };
      }
      this.server.revoke(found.sessionId, scope);
      return { data: null, error: null };
    },
  };

  constructor(private readonly server: FakeAuthServer) {}

  private fail(message: string, status: number, code: string) {
    return { data: null as never, error: apiError(message, status, code) };
  }

  async signUp(params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }): Result<{ user: unknown; session: null }> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };

    const existing = this.server.findUserByEmail(params.email);
    if (existing) {
      // GoTrue with confirmations on: a fake success, no email.
      return { data: { user: {}, session: null }, error: null };
    }
    const user = this.server.createUser({
      email: params.email,
      password: params.password,
      confirmed: false,
      displayName: params.options?.data?.display_name as string | undefined,
    });
    this.server.issueTokenHash(user, 'signup', params.options?.emailRedirectTo);
    return { data: { user: { id: user.id }, session: null }, error: null };
  }

  async resend(params: {
    type: 'signup';
    email: string;
    options?: { emailRedirectTo?: string };
  }): Result<Record<string, never>> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const user = this.server.findUserByEmail(params.email);
    if (user && !user.confirmed) {
      this.server.issueTokenHash(
        user,
        'signup',
        params.options?.emailRedirectTo,
      );
    }
    return { data: {}, error: null };
  }

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string },
  ): Result<Record<string, never>> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const user = this.server.findUserByEmail(email);
    if (user) this.server.issueTokenHash(user, 'recovery', options?.redirectTo);
    return { data: {}, error: null };
  }

  async verifyOtp(params: {
    token_hash: string;
    type: string;
  }): Result<{ session: FakeSession; user: FakeSession['user'] }> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const user = this.server.consumeTokenHash(params.token_hash, params.type);
    if (!user) {
      return this.fail(
        'Email link is invalid or has expired',
        403,
        'otp_expired',
      );
    }
    user.confirmed = true;
    this.session = await this.server.startSession(user);
    return {
      data: { session: this.session, user: this.session.user },
      error: null,
    };
  }

  async signInWithPassword(params: {
    email: string;
    password: string;
  }): Result<{ session: FakeSession; user: FakeSession['user'] }> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const user = this.server.findUserByEmail(params.email);
    if (!user || user.password !== params.password) {
      return this.fail('Invalid login credentials', 400, 'invalid_credentials');
    }
    if (!user.confirmed) {
      return this.fail('Email not confirmed', 400, 'email_not_confirmed');
    }
    this.session = await this.server.startSession(user);
    return {
      data: { session: this.session, user: this.session.user },
      error: null,
    };
  }

  async refreshSession(params: {
    refresh_token: string;
  }): Result<{ session: FakeSession; user: FakeSession['user'] }> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const session = await this.server.rotateRefreshToken(params.refresh_token);
    if (!session) {
      return this.fail(
        'Invalid Refresh Token: Refresh Token Not Found',
        400,
        'refresh_token_not_found',
      );
    }
    return { data: { session, user: session.user }, error: null };
  }

  async updateUser(attributes: {
    password?: string;
  }): Result<{ user: FakeSession['user'] }> {
    const down = this.server.guard();
    if (down) return { data: null as never, error: down };
    const found =
      this.session && this.server.sessionFromJwt(this.session.access_token);
    const user = found && this.server.users.get(found.userId);
    if (!user || !this.session) {
      return this.fail('Auth session missing!', 400, 'session_not_found');
    }
    if (attributes.password !== undefined) {
      if (attributes.password === user.password) {
        return this.fail(
          'New password should be different from the old password.',
          422,
          'same_password',
        );
      }
      user.password = attributes.password;
    }
    return { data: { user: this.session.user }, error: null };
  }

  async signOut(
    options: { scope?: 'local' | 'global' | 'others' } = {},
  ): Promise<{ error: null }> {
    const found =
      this.session && this.server.sessionFromJwt(this.session.access_token);
    if (found) this.server.revoke(found.sessionId, options.scope ?? 'global');
    this.session = null;
    return { error: null };
  }
}

/** In-memory `ProfilesRepository`, filled the way the DB trigger would. */
export class FakeProfilesRepository {
  readonly rows = new Map<string, ProfileRow>();

  addFor(user: {
    id: string;
    email: string;
    metadata: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const name =
      (typeof user.metadata.display_name === 'string' &&
        user.metadata.display_name.trim()) ||
      user.email.split('@')[0];
    this.rows.set(user.id, {
      id: user.id,
      display_name: name,
      experience_level: null,
      learning_goals: [],
      role: 'learner',
      created_at: now,
      updated_at: now,
    });
  }

  async findById(_token: string, id: string): Promise<ProfileRow | null> {
    return this.rows.get(id) ?? null;
  }

  async update(
    _token: string,
    id: string,
    patch: ProfilePatch,
  ): Promise<ProfileRow | null> {
    const row = this.rows.get(id);
    if (!row) return null;
    const updated = { ...row, ...patch, updated_at: new Date().toISOString() };
    this.rows.set(id, updated);
    return updated;
  }
}
