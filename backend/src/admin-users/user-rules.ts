import type { UserRole } from '../auth/decorators/roles.decorator.js';

// Pure rules of admin user management: no Nest, no Supabase. The database
// function admin_set_role enforces the role rules a second time.

/** Account status shown and filtered on in the admin user list. */
export const USER_STATUSES = ['active', 'disabled', 'unverified'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Same rule as the `admin_list_users` status filter. */
export function userStatus(user: {
  disabled: boolean;
  email_verified: boolean;
}): UserStatus {
  if (user.disabled) return 'disabled';
  return user.email_verified ? 'active' : 'unverified';
}

export interface UserTarget {
  id: string;
  role: UserRole;
  disabled: boolean;
}

/** Why a change is refused (`409`), or null when it may go ahead. */
export type UserChangeRefusal = 'self' | 'admin' | 'disabled';

export const REFUSAL_MESSAGES: Record<UserChangeRefusal, string> = {
  self: 'You cannot change your own account here',
  admin: 'Admins cannot be disabled: change the role to learner first',
  disabled: 'Enable the account before making it an admin',
};

/**
 * Role change. Nobody changes their own role, so the admin making the change
 * stays one: there is always at least one admin. A disabled account is not
 * promoted.
 */
export function roleChangeRefusal(
  actorId: string,
  target: UserTarget,
  role: UserRole,
): UserChangeRefusal | null {
  if (target.id === actorId) return 'self';
  if (role === 'admin' && target.role !== 'admin' && target.disabled) {
    return 'disabled';
  }
  return null;
}

/**
 * Disable / enable. Not on yourself; admins are not disabled (demote first),
 * so an admin account always works. Enabling has no further rule.
 */
export function statusChangeRefusal(
  actorId: string,
  target: UserTarget,
  disable: boolean,
): UserChangeRefusal | null {
  if (target.id === actorId) return 'self';
  if (disable && target.role === 'admin') return 'admin';
  return null;
}

/** Search text, trimmed; empty means no search (SQL escapes `%` and `_`). */
export function normaliseSearch(search: string | undefined): string | null {
  const value = search?.trim();
  return value ? value : null;
}
