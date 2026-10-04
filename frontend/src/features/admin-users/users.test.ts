import { describe, expect, it } from 'vitest';
import {
  allowedActions,
  auditRole,
  parseUserListParams,
  userListSearch,
} from './users';

describe('user list params', () => {
  it('reads valid params and drops invalid ones', () => {
    expect(
      parseUserListParams(
        new URLSearchParams(
          'q=%20ana%20&role=admin&status=disabled&page=3&pageSize=50',
        ),
      ),
    ).toEqual({
      search: 'ana',
      role: 'admin',
      status: 'disabled',
      page: 3,
      pageSize: 50,
    });
    expect(
      parseUserListParams(
        new URLSearchParams(
          'q=%20&role=owner&status=banned&page=0&pageSize=30',
        ),
      ),
    ).toEqual({
      search: undefined,
      role: undefined,
      status: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('cuts the search at the API limit', () => {
    const params = parseUserListParams(
      new URLSearchParams(`q=${'x'.repeat(150)}`),
    );
    expect(params.search).toHaveLength(100);
  });

  it('writes params without defaults and round-trips', () => {
    expect(userListSearch({ page: 1, pageSize: 20 }).toString()).toBe('');
    const params = {
      search: 'bob',
      role: 'learner' as const,
      status: 'active' as const,
      page: 2,
      pageSize: 100 as const,
    };
    expect(parseUserListParams(userListSearch(params))).toEqual(params);
  });
});

describe('allowedActions', () => {
  const learner = { id: 'u1', role: 'learner' as const, disabled: false };

  it('allows nothing on yourself (or before the profile has loaded)', () => {
    expect(allowedActions('u1', learner)).toEqual({
      self: true,
      changeRole: false,
      promote: false,
      disable: false,
      enable: false,
    });
    expect(allowedActions(undefined, learner).self).toBe(true);
  });

  it('lets an admin promote and disable a learner', () => {
    expect(allowedActions('me', learner)).toMatchObject({
      changeRole: true,
      promote: true,
      disable: true,
      enable: false,
    });
  });

  it('does not disable an admin, nor promote a disabled account', () => {
    expect(allowedActions('me', { ...learner, role: 'admin' }).disable).toBe(
      false,
    );
    expect(allowedActions('me', { ...learner, disabled: true })).toMatchObject({
      promote: false,
      disable: false,
      enable: true,
    });
  });
});

describe('auditRole', () => {
  it('knows the two roles only', () => {
    expect(auditRole('admin')).toBe('admin');
    expect(auditRole('learner')).toBe('learner');
    expect(auditRole('owner')).toBeNull();
    expect(auditRole(null)).toBeNull();
  });
});
