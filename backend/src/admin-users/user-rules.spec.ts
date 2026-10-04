import {
  normaliseSearch,
  roleChangeRefusal,
  statusChangeRefusal,
  type UserTarget,
  userStatus,
} from './user-rules.js';

const ACTOR = 'actor';
const learner: UserTarget = { id: 'u1', role: 'learner', disabled: false };
const admin: UserTarget = { id: 'u2', role: 'admin', disabled: false };
const disabledLearner: UserTarget = { ...learner, disabled: true };

describe('userStatus', () => {
  it('is disabled first, then unverified, else active', () => {
    expect(userStatus({ disabled: true, email_verified: false })).toBe(
      'disabled',
    );
    expect(userStatus({ disabled: true, email_verified: true })).toBe(
      'disabled',
    );
    expect(userStatus({ disabled: false, email_verified: false })).toBe(
      'unverified',
    );
    expect(userStatus({ disabled: false, email_verified: true })).toBe(
      'active',
    );
  });
});

describe('roleChangeRefusal', () => {
  it('refuses a change of your own role, whatever the role', () => {
    const self = { ...admin, id: ACTOR };
    expect(roleChangeRefusal(ACTOR, self, 'learner')).toBe('self');
    expect(roleChangeRefusal(ACTOR, self, 'admin')).toBe('self');
  });

  it('allows promoting a learner and demoting another admin', () => {
    expect(roleChangeRefusal(ACTOR, learner, 'admin')).toBeNull();
    expect(roleChangeRefusal(ACTOR, admin, 'learner')).toBeNull();
  });

  it('refuses to promote a disabled account, but not to demote one', () => {
    expect(roleChangeRefusal(ACTOR, disabledLearner, 'admin')).toBe('disabled');
    expect(roleChangeRefusal(ACTOR, disabledLearner, 'learner')).toBeNull();
  });
});

describe('statusChangeRefusal', () => {
  it('refuses to disable or enable yourself', () => {
    const self = { ...learner, id: ACTOR };
    expect(statusChangeRefusal(ACTOR, self, true)).toBe('self');
    expect(statusChangeRefusal(ACTOR, self, false)).toBe('self');
  });

  it('refuses to disable an admin, allows a learner', () => {
    expect(statusChangeRefusal(ACTOR, admin, true)).toBe('admin');
    expect(statusChangeRefusal(ACTOR, learner, true)).toBeNull();
  });

  it('allows enabling anyone else', () => {
    expect(statusChangeRefusal(ACTOR, disabledLearner, false)).toBeNull();
  });
});

describe('normaliseSearch', () => {
  it('trims and turns empty text into null', () => {
    expect(normaliseSearch('  ana ')).toBe('ana');
    expect(normaliseSearch('   ')).toBeNull();
    expect(normaliseSearch(undefined)).toBeNull();
  });
});
