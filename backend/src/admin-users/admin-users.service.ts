import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import type { UserRole } from '../auth/decorators/roles.decorator.js';
import { describeError } from '../common/errors/describe-error.js';
import { isPgError } from '../common/errors/pg-error.js';
import { DashboardRepository } from '../dashboard/dashboard.repository.js';
import { toSkillProgress } from '../dashboard/mapping.js';
import {
  type AdminUserRow,
  AdminUsersRepository,
  type AuditRow,
  type UserAttemptRow,
} from './admin-users.repository.js';
import {
  AdminAuditEntryDto,
  AdminUserAttemptDto,
  AdminUserDto,
  AdminUserPageDto,
  AdminUserSummaryDto,
  ListAdminUsersQueryDto,
} from './dto/admin-users.dto.js';
import { UserAccountsRepository } from './user-accounts.repository.js';
import {
  normaliseSearch,
  REFUSAL_MESSAGES,
  roleChangeRefusal,
  statusChangeRefusal,
  type UserChangeRefusal,
  userStatus,
} from './user-rules.js';

export const RECENT_ATTEMPTS_LIMIT = 10;
export const AUDIT_LOG_LIMIT = 50;

const USER_NOT_FOUND = 'User not found';
const AUTH_UNAVAILABLE =
  'Authentication service is unavailable. Try again later.';

function toSummary(row: AdminUserRow): AdminUserSummaryDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: userStatus(row),
    emailVerified: row.email_verified,
    disabled: row.disabled,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    lessonsCompleted: row.lessons_completed,
    exercisesAttempted: row.exercises_attempted,
  };
}

function toAttempt(row: UserAttemptRow): AdminUserAttemptDto {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseType: row.exercise?.type ?? null,
    question: row.exercise?.question ?? null,
    lessonId: row.exercise?.lesson_id ?? null,
    score: row.score,
    isCorrect: row.is_correct,
    attemptedAt: row.attempted_at,
  };
}

function toAuditEntry(row: AuditRow): AdminAuditEntryDto {
  return {
    id: row.id,
    action: row.action,
    from: row.from_value,
    to: row.to_value,
    actor:
      row.actor_id && row.actor
        ? { id: row.actor_id, displayName: row.actor.display_name }
        : null,
    createdAt: row.created_at,
  };
}

function refused(reason: UserChangeRefusal): ConflictException {
  return new ConflictException(REFUSAL_MESSAGES[reason]);
}

/**
 * Errors of the admin_* SQL functions: they re-check the rules (and the
 * admin) inside the transaction, so a race ends in the same answers.
 */
function functionError(error: unknown): unknown {
  if (isPgError(error, '42501')) {
    return new ForbiddenException('You do not have access to this resource');
  }
  if (isPgError(error, 'P0002')) return new NotFoundException(USER_NOT_FOUND);
  if (isPgError(error, 'P0001')) {
    const hint = (error as { hint?: unknown }).hint;
    if (hint === 'self' || hint === 'disabled') return refused(hint);
    return new ConflictException('The account changed meanwhile. Reload it.');
  }
  return error;
}

/**
 * Admin user management. Reads and role changes run as the admin (the SQL
 * functions check is_admin()); only the Supabase Auth ban uses the service
 * role (`UserAccountsRepository`).
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly users: AdminUsersRepository,
    private readonly accounts: UserAccountsRepository,
    private readonly dashboard: DashboardRepository,
  ) {}

  async list(
    user: AuthUser,
    query: ListAdminUsersQueryDto,
  ): Promise<AdminUserPageDto> {
    const { page, pageSize } = query;
    const rows = await this.users.list(user.accessToken, {
      search: normaliseSearch(query.search),
      role: query.role ?? null,
      status: query.status ?? null,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return {
      items: rows.items.map(toSummary),
      total: rows.total,
      page,
      pageSize,
    };
  }

  async get(user: AuthUser, id: string): Promise<AdminUserDto> {
    const row = await this.findOr404(user, id);
    const [skills, attempts, audit] = await Promise.all([
      this.dashboard.listSkillProgress(user.accessToken, id),
      this.users.listAttempts(user.accessToken, id, RECENT_ATTEMPTS_LIMIT),
      this.users.listAudit(user.accessToken, id, AUDIT_LOG_LIMIT),
    ]);
    return {
      ...toSummary(row),
      experienceLevel: row.experience_level,
      learningGoals: row.learning_goals,
      skills: skills.map(toSkillProgress),
      recentAttempts: attempts.map(toAttempt),
      auditLog: audit.map(toAuditEntry),
    };
  }

  async changeRole(
    user: AuthUser,
    id: string,
    role: UserRole,
  ): Promise<AdminUserDto> {
    const target = await this.findOr404(user, id);
    const refusal = roleChangeRefusal(user.id, target, role);
    if (refusal) throw refused(refusal);

    if (target.role !== role) {
      try {
        await this.users.setRole(user.accessToken, id, role);
      } catch (error) {
        throw functionError(error);
      }
    }
    return this.get(user, id);
  }

  async setDisabled(
    user: AuthUser,
    id: string,
    disabled: boolean,
  ): Promise<AdminUserDto> {
    const target = await this.findOr404(user, id);
    const refusal = statusChangeRefusal(user.id, target, disabled);
    if (refusal) throw refused(refusal);
    if (target.disabled === disabled) return this.get(user, id);

    try {
      await this.accounts.setDisabled(id, disabled);
    } catch (error) {
      this.logger.warn(
        `${disabled ? 'disable' : 'enable'} failed: ${describeError(error)}`,
      );
      if ((error as { status?: unknown }).status === 404) {
        throw new NotFoundException(USER_NOT_FOUND);
      }
      throw new ServiceUnavailableException(AUTH_UNAVAILABLE);
    }

    try {
      await this.users.logStatusChange(user.accessToken, id, disabled);
    } catch (error) {
      // The ban is in place; only the audit row is missing. Say so loudly
      // rather than undo what the admin asked for.
      this.logger.error(
        `audit row for ${disabled ? 'disable' : 'enable'} of ${id} not written: ${describeError(error)}`,
      );
    }
    return this.get(user, id);
  }

  private async findOr404(user: AuthUser, id: string): Promise<AdminUserRow> {
    const row = await this.users.find(user.accessToken, id);
    if (!row) throw new NotFoundException(USER_NOT_FOUND);
    return row;
  }
}
