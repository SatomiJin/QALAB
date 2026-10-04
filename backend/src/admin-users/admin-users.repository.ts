import { Injectable } from '@nestjs/common';
import type { UserRole } from '../auth/decorators/roles.decorator.js';
import type { ExperienceLevel } from '../profile/profiles.repository.js';
import type { ExerciseType } from '../practice/exercise-schema.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { UserStatus } from './user-rules.js';

/** Row of `public.admin_user_rows()` (via admin_list_users / admin_get_user). */
export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  experience_level: ExperienceLevel | null;
  learning_goals: string[];
  email_verified: boolean;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  lessons_completed: number;
  exercises_attempted: number;
}

export interface AdminUserFilter {
  search: string | null;
  role: UserRole | null;
  status: UserStatus | null;
  limit: number;
  offset: number;
}

export interface AdminUserPageRows {
  total: number;
  items: AdminUserRow[];
}

export interface UserAttemptRow {
  id: string;
  exercise_id: string;
  score: number;
  is_correct: boolean;
  attempted_at: string;
  exercise: { type: ExerciseType; question: string; lesson_id: string } | null;
}

export const AUDIT_ACTIONS = ['role_changed', 'disabled', 'enabled'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditRow {
  id: string;
  action: AuditAction;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor_id: string | null;
  actor: { display_name: string } | null;
}

const ATTEMPT_COLUMNS =
  'id, exercise_id, score, is_correct, attempted_at, exercise:exercises(type, question, lesson_id)';
const AUDIT_COLUMNS =
  'id, action, from_value, to_value, created_at, actor_id, actor:profiles!admin_audit_log_actor_id_fkey(display_name)';

/**
 * Admin user management, as the admin: the SQL functions check is_admin()
 * themselves (they read auth.users), the tables are read under admin RLS.
 * Every query filters on the target user id.
 */
@Injectable()
export class AdminUsersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(
    accessToken: string,
    filter: AdminUserFilter,
  ): Promise<AdminUserPageRows> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .rpc('admin_list_users', {
        p_search: filter.search,
        p_role: filter.role,
        p_status: filter.status,
        p_limit: filter.limit,
        p_offset: filter.offset,
      });
    if (error) throw error;
    return data as AdminUserPageRows;
  }

  async find(accessToken: string, id: string): Promise<AdminUserRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .rpc('admin_get_user', { p_user_id: id });
    if (error) throw error;
    return ((data ?? []) as AdminUserRow[])[0] ?? null;
  }

  /** Latest attempts, newest first (scores only, never the answers). */
  async listAttempts(
    accessToken: string,
    userId: string,
    limit: number,
  ): Promise<UserAttemptRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_attempts')
      .select(ATTEMPT_COLUMNS)
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(limit)
      .overrideTypes<UserAttemptRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /** Audit entries about the user, newest first. */
  async listAudit(
    accessToken: string,
    userId: string,
    limit: number,
  ): Promise<AuditRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('admin_audit_log')
      .select(AUDIT_COLUMNS)
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .overrideTypes<AuditRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /** Changes the role and writes the audit row in one transaction. */
  async setRole(accessToken: string, id: string, role: UserRole) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .rpc('admin_set_role', { p_user_id: id, p_role: role });
    if (error) throw error;
  }

  /** Audit row for a ban / unban already applied in Supabase Auth. */
  async logStatusChange(accessToken: string, id: string, disabled: boolean) {
    const { error } = await this.supabase
      .forUser(accessToken)
      .rpc('admin_log_status_change', {
        p_user_id: id,
        p_disabled: disabled,
      });
    if (error) throw error;
  }
}
