/**
 * `/admin/users*` of the mock API, with the backend rules: admins only (403),
 * nobody changes their own account (409), admins are not disabled (409), a
 * disabled account is not promoted (409), the same role or status changes
 * nothing, and every change adds one audit entry.
 */

export interface MockAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'learner' | 'admin';
  verified: boolean;
  disabled?: boolean;
  createdAt?: string;
  lastSignInAt?: string | null;
  experienceLevel: string | null;
  learningGoals: string[];
}

interface AuditEntry {
  id: string;
  targetId: string;
  action: 'role_changed' | 'disabled' | 'enabled';
  from: string;
  to: string;
  actor: { id: string; displayName: string };
  createdAt: string;
}

type Result = { status: number; json?: unknown };

const PAGE_SIZES = [20, 50, 100];

function error(statusCode: number, error: string, message: string): Result {
  return { status: statusCode, json: { statusCode, error, message } };
}

let sequence = 0;

export class MockUsers {
  readonly audit: AuditEntry[] = [];
  /** Recent attempts shown on a user page, per user id. */
  readonly attempts = new Map<string, unknown[]>();
  /** Skill progress shown on a user page, per user id (none by default). */
  readonly skills = new Map<string, unknown[]>();
  /** Set after the page loaded to make the next call fail with 500. */
  failing = false;

  private readonly accounts: () => MockAccount[];

  constructor(accounts: () => MockAccount[]) {
    this.accounts = accounts;
  }

  private status(user: MockAccount) {
    if (user.disabled) return 'disabled';
    return user.verified ? 'active' : 'unverified';
  }

  private summary(user: MockAccount) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: this.status(user),
      emailVerified: user.verified,
      disabled: Boolean(user.disabled),
      createdAt: user.createdAt ?? '2026-09-01T08:00:00.000Z',
      lastSignInAt: user.lastSignInAt ?? null,
      lessonsCompleted: 0,
      exercisesAttempted: (this.attempts.get(user.id) ?? []).length,
    };
  }

  private detail(user: MockAccount) {
    return {
      ...this.summary(user),
      experienceLevel: user.experienceLevel,
      learningGoals: user.learningGoals,
      skills: this.skills.get(user.id) ?? [],
      recentAttempts: this.attempts.get(user.id) ?? [],
      auditLog: this.audit
        .filter((entry) => entry.targetId === user.id)
        .reverse()
        .map(({ targetId: _target, ...entry }) => entry),
    };
  }

  log(
    actor: MockAccount,
    target: MockAccount,
    action: AuditEntry['action'],
    from: string,
    to: string,
  ) {
    this.audit.push({
      id: `audit-${++sequence}`,
      targetId: target.id,
      action,
      from,
      to,
      actor: { id: actor.id, displayName: actor.displayName },
      createdAt: new Date(Date.now() + sequence).toISOString(),
    });
  }

  handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    actor: MockAccount,
    query: URLSearchParams,
  ): Result | undefined {
    const match =
      /^\/admin\/users(?:\/([^/]+)(?:\/(role|disable|enable))?)?$/.exec(path);
    if (!match) return undefined;
    if (actor.role !== 'admin') {
      return error(403, 'Forbidden', 'You do not have access to this resource');
    }
    if (this.failing) {
      return error(500, 'Internal Server Error', 'Internal server error');
    }
    const [, id, action] = match;

    if (!id) {
      if (method !== 'GET') return undefined;
      return { status: 200, json: this.list(query) };
    }

    const target = this.accounts().find((user) => user.id === id);
    if (!target) return error(404, 'Not Found', 'User not found');

    if (!action && method === 'GET') {
      return { status: 200, json: this.detail(target) };
    }

    const self = target.id === actor.id;
    if (action === 'role' && method === 'PATCH') {
      const role = body.role;
      if (role !== 'learner' && role !== 'admin') {
        return error(400, 'Bad Request', 'role must be one of learner, admin');
      }
      if (self) {
        return error(
          409,
          'Conflict',
          'You cannot change your own account here',
        );
      }
      if (role === 'admin' && target.role !== 'admin' && target.disabled) {
        return error(
          409,
          'Conflict',
          'Enable the account before making it an admin',
        );
      }
      if (target.role !== role) {
        this.log(actor, target, 'role_changed', target.role, role);
        target.role = role;
      }
      return { status: 200, json: this.detail(target) };
    }

    if ((action === 'disable' || action === 'enable') && method === 'POST') {
      const disable = action === 'disable';
      if (self) {
        return error(
          409,
          'Conflict',
          'You cannot change your own account here',
        );
      }
      if (disable && target.role === 'admin') {
        return error(
          409,
          'Conflict',
          'Admins cannot be disabled: change the role to learner first',
        );
      }
      if (Boolean(target.disabled) !== disable) {
        this.log(
          actor,
          target,
          disable ? 'disabled' : 'enabled',
          disable ? 'active' : 'disabled',
          disable ? 'disabled' : 'active',
        );
        target.disabled = disable;
      }
      return { status: 200, json: this.detail(target) };
    }
    return undefined;
  }

  private list(query: URLSearchParams) {
    const search = (query.get('search') ?? '').trim().toLowerCase();
    const role = query.get('role');
    const status = query.get('status');
    const page = Number(query.get('page') ?? 1) || 1;
    const sizeParam = Number(query.get('pageSize') ?? 20);
    const pageSize = PAGE_SIZES.includes(sizeParam) ? sizeParam : 20;

    const matching = this.accounts()
      .filter(
        (user) =>
          !search ||
          user.email.toLowerCase().includes(search) ||
          user.displayName.toLowerCase().includes(search),
      )
      .filter((user) => !role || user.role === role)
      .filter((user) => !status || this.status(user) === status)
      .map((user) => this.summary(user))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      items: matching.slice((page - 1) * pageSize, page * pageSize),
      total: matching.length,
      page,
      pageSize,
    };
  }
}
