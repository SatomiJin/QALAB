import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type PageSize,
  USER_ROLES,
  USER_SEARCH_MAX_LENGTH,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from '../../types/api';
import type { AdminUserListParams } from './users-api';

// User list state in the URL: ?q=&role=&status=&page=&pageSize= -------------

const includes = <T extends string>(list: readonly T[], value: string) =>
  (list as readonly string[]).includes(value);

/** Reads the list params with safe defaults. */
export function parseUserListParams(
  search: URLSearchParams,
): AdminUserListParams {
  const q = (search.get('q') ?? '').trim().slice(0, USER_SEARCH_MAX_LENGTH);
  const role = search.get('role') ?? '';
  const status = search.get('status') ?? '';
  const page = Number(search.get('page'));
  const pageSize = Number(search.get('pageSize'));
  return {
    search: q || undefined,
    role: includes(USER_ROLES, role) ? (role as UserRole) : undefined,
    status: includes(USER_STATUSES, status)
      ? (status as UserStatus)
      : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? (pageSize as PageSize)
      : DEFAULT_PAGE_SIZE,
  };
}

/** Writes the params, leaving out defaults. */
export function userListSearch(params: AdminUserListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.search) search.set('q', params.search);
  if (params.role) search.set('role', params.role);
  if (params.status) search.set('status', params.status);
  if (params.page > 1) search.set('page', String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    search.set('pageSize', String(params.pageSize));
  }
  return search;
}

const LIST_KEY = 'qalab.adminUserList';

/** The last user list URL, so the user page can go back to it. */
export function rememberUserList(search: string): void {
  try {
    sessionStorage.setItem(LIST_KEY, search);
  } catch {
    // Storage unavailable (private mode): back goes to the plain list.
  }
}

export function userListPath(): string {
  let search = '';
  try {
    search = sessionStorage.getItem(LIST_KEY) ?? '';
  } catch {
    search = '';
  }
  return `/admin/users${search}`;
}

// Audit log ---------------------------------------------------------------------

/** A role from the audit log, if it is one we can translate. */
export function auditRole(value: string | null): UserRole | null {
  return value !== null && includes(USER_ROLES, value)
    ? (value as UserRole)
    : null;
}

/**
 * What the viewer may do to the user: nothing to themselves; an admin is not
 * disabled (demote first); a disabled account is not promoted. Same rules as
 * the API, which stays the authority.
 */
export function allowedActions(
  viewerId: string | undefined,
  user: { id: string; role: UserRole; disabled: boolean },
) {
  const self = viewerId === undefined || viewerId === user.id;
  return {
    self,
    changeRole: !self,
    promote: !self && !user.disabled,
    disable: !self && !user.disabled && user.role !== 'admin',
    enable: !self && user.disabled,
  };
}
