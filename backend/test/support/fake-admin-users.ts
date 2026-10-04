import { randomUUID } from 'node:crypto';
import type {
  AdminUserFilter,
  AdminUserPageRows,
  AdminUserRow,
  AuditAction,
  AuditRow,
  UserAttemptRow,
} from '../../src/admin-users/admin-users.repository.js';
import type { UserRole } from '../../src/auth/decorators/roles.decorator.js';
import type {
  FakeAuthServer,
  FakeProfilesRepository,
} from './fake-auth-server.js';
import type {
  FakeContentRepository,
  FakeLessonProgressRepository,
} from './fake-learning.js';
import {
  type FakeAttemptsRepository,
  type FakeExercisesRepository,
  userIdFromToken,
} from './fake-practice.js';

interface StoredAudit {
  id: string;
  actor_id: string | null;
  target_id: string;
  action: AuditAction;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

/** A Postgres error as PostgREST returns it (plain object). */
const pgError = (code: string, message: string, hint?: string) => ({
  code,
  message,
  hint: hint ?? null,
  details: null,
});

/**
 * In-memory `AdminUsersRepository`, built on the auth server (email, ban,
 * sign-in), the profiles (role) and the learning / practice stores. It mirrors
 * the SQL functions: the caller must be an admin (`42501`), unknown user
 * (`P0002`), the role rules with their hints, and the ban-state check of
 * admin_log_status_change.
 */
export class FakeAdminUsersRepository {
  readonly audit: StoredAudit[] = [];

  constructor(
    private readonly auth: FakeAuthServer,
    private readonly profiles: FakeProfilesRepository,
    private readonly content: FakeContentRepository,
    private readonly progress: FakeLessonProgressRepository,
    private readonly exercises: FakeExercisesRepository,
    private readonly attempts: FakeAttemptsRepository,
  ) {}

  private requireAdmin(token: string): string {
    const actor = userIdFromToken(token);
    if (this.profiles.rows.get(actor)?.role !== 'admin') {
      throw pgError('42501', 'admin only');
    }
    return actor;
  }

  private row(id: string): AdminUserRow | null {
    const profile = this.profiles.rows.get(id);
    const user = this.auth.users.get(id);
    if (!profile || !user) return null;
    const progress = [...this.progress.rows.values()].filter(
      (row) =>
        row.user_id === id &&
        row.status === 'completed' &&
        this.content.isLessonVisible(row.lesson_id),
    );
    const attempted = new Set(
      this.attempts.rows
        .filter((row) => row.user_id === id)
        .map((row) => row.exercise_id),
    );
    return {
      id,
      email: user.email,
      display_name: profile.display_name,
      role: profile.role,
      experience_level: profile.experience_level,
      learning_goals: profile.learning_goals,
      email_verified: user.confirmed,
      disabled: this.auth.isBanned(user),
      created_at: user.createdAt,
      last_sign_in_at: user.lastSignInAt,
      lessons_completed: progress.length,
      exercises_attempted: attempted.size,
    };
  }

  async list(
    token: string,
    filter: AdminUserFilter,
  ): Promise<AdminUserPageRows> {
    this.requireAdmin(token);
    const search = filter.search?.toLowerCase() ?? null;
    const matching = [...this.profiles.rows.keys()]
      .map((id) => this.row(id))
      .filter((row): row is AdminUserRow => row !== null)
      .filter(
        (row) =>
          !search ||
          row.email.toLowerCase().includes(search) ||
          row.display_name.toLowerCase().includes(search),
      )
      .filter((row) => !filter.role || row.role === filter.role)
      .filter((row) => {
        if (!filter.status) return true;
        if (filter.status === 'disabled') return row.disabled;
        if (row.disabled) return false;
        return filter.status === 'active'
          ? row.email_verified
          : !row.email_verified;
      })
      .sort(
        (a, b) =>
          b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
      );
    return {
      total: matching.length,
      items: matching.slice(filter.offset, filter.offset + filter.limit),
    };
  }

  async find(token: string, id: string): Promise<AdminUserRow | null> {
    this.requireAdmin(token);
    return this.row(id);
  }

  async listAttempts(
    token: string,
    userId: string,
    limit: number,
  ): Promise<UserAttemptRow[]> {
    this.requireAdmin(token);
    return this.attempts.rows
      .filter((row) => row.user_id === userId)
      .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at))
      .slice(0, limit)
      .map((row) => {
        const exercise = this.exercises.rows.get(row.exercise_id)?.row;
        return {
          id: row.id,
          exercise_id: row.exercise_id,
          score: row.score,
          is_correct: row.is_correct,
          attempted_at: row.attempted_at,
          exercise: exercise
            ? {
                type: exercise.type,
                question: exercise.question,
                lesson_id: exercise.lesson_id,
              }
            : null,
        };
      });
  }

  async listAudit(
    token: string,
    userId: string,
    limit: number,
  ): Promise<AuditRow[]> {
    this.requireAdmin(token);
    return this.audit
      .filter((row) => row.target_id === userId)
      .slice()
      .reverse()
      .slice(0, limit)
      .map((row) => {
        const actor = row.actor_id && this.profiles.rows.get(row.actor_id);
        return {
          id: row.id,
          action: row.action,
          from_value: row.from_value,
          to_value: row.to_value,
          created_at: row.created_at,
          actor_id: row.actor_id,
          actor: actor ? { display_name: actor.display_name } : null,
        };
      });
  }

  async setRole(token: string, id: string, role: UserRole): Promise<void> {
    const actor = userIdFromToken(token);
    if (id === actor) {
      throw pgError('P0001', 'You cannot change your own role', 'self');
    }
    this.requireAdmin(token);
    const target = this.row(id);
    if (!target) throw pgError('P0002', 'user not found');
    if (target.role === role) return;
    if (role === 'admin' && target.disabled) {
      throw pgError('P0001', 'Enable the account first', 'disabled');
    }
    this.profiles.rows.set(id, {
      ...this.profiles.rows.get(id)!,
      role,
      updated_at: new Date().toISOString(),
    });
    this.log(actor, id, 'role_changed', target.role, role);
  }

  async logStatusChange(
    token: string,
    id: string,
    disabled: boolean,
  ): Promise<void> {
    const actor = this.requireAdmin(token);
    const target = this.row(id);
    if (!target) throw pgError('P0002', 'user not found');
    if (target.disabled !== disabled) {
      throw pgError('P0001', 'The account status does not match', 'state');
    }
    this.log(
      actor,
      id,
      disabled ? 'disabled' : 'enabled',
      disabled ? 'active' : 'disabled',
      disabled ? 'disabled' : 'active',
    );
  }

  private log(
    actor: string,
    target: string,
    action: AuditAction,
    from: string,
    to: string,
  ): void {
    this.audit.push({
      id: randomUUID(),
      actor_id: actor,
      target_id: target,
      action,
      from_value: from,
      to_value: to,
      created_at: new Date().toISOString(),
    });
  }
}
