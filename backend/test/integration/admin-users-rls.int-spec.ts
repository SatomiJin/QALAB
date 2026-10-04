import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, PASSWORD, serviceClient, TestUsers } from './support.js';

/**
 * Admin user management against the real database and Supabase Auth: the
 * admin_* functions (is_admin check, role rules, audit), the audit log RLS and
 * a real ban. Acts as an attacker holding a learner JWT and the anon key would.
 */
describe('admin users (integration)', () => {
  const users = new TestUsers();
  let admin: { id: string; email: string };
  let learner: { id: string; email: string };
  let asAdmin: SupabaseClient;
  let asLearner: SupabaseClient;

  const listArgs = (search: string | null) => ({
    p_search: search,
    p_role: null,
    p_status: null,
    p_limit: 20,
    p_offset: 0,
  });

  beforeAll(async () => {
    admin = await users.create('users-admin', { displayName: 'IT Admin' });
    learner = await users.create('users-learner');
    await users.setRole(admin.id, 'admin');
    asAdmin = await users.signIn(admin.email);
    asLearner = await users.signIn(learner.email);
  });

  afterAll(async () => {
    await users.cleanup();
  });

  describe('as a learner', () => {
    it('cannot list or read users (42501)', async () => {
      const list = await asLearner.rpc('admin_list_users', listArgs(null));
      expect(list.error?.code).toBe('42501');
      const one = await asLearner.rpc('admin_get_user', {
        p_user_id: admin.id,
      });
      expect(one.error?.code).toBe('42501');
    });

    it('cannot call the internal row function at all', async () => {
      const { error } = await asLearner.rpc('admin_user_rows');
      expect(error).not.toBeNull();
    });

    it('cannot promote anyone, themselves included', async () => {
      const other = await asLearner.rpc('admin_set_role', {
        p_user_id: admin.id,
        p_role: 'learner',
      });
      expect(other.error?.code).toBe('42501');
      const self = await asLearner.rpc('admin_set_role', {
        p_user_id: learner.id,
        p_role: 'admin',
      });
      expect(self.error).not.toBeNull();

      const { data } = await serviceClient()
        .from('profiles')
        .select('role')
        .eq('id', learner.id)
        .single();
      expect(data).toEqual({ role: 'learner' });
    });

    it('cannot read, write or forge audit rows', async () => {
      const read = await asLearner.from('admin_audit_log').select('id');
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);

      const insert = await asLearner.from('admin_audit_log').insert({
        target_id: learner.id,
        action: 'enabled',
      });
      expect(insert.error?.code).toBe('42501');

      const log = await asLearner.rpc('admin_log_status_change', {
        p_user_id: learner.id,
        p_disabled: false,
      });
      expect(log.error?.code).toBe('42501');
    });

    it('still cannot update their own role column directly', async () => {
      const { error } = await asLearner
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', learner.id);
      expect(error?.code).toBe('42501');
    });
  });

  describe('as an admin', () => {
    it('lists users with email, status and search (wildcards literal)', async () => {
      const { data, error } = await asAdmin.rpc(
        'admin_list_users',
        listArgs(learner.email.toUpperCase()),
      );
      expect(error).toBeNull();
      expect(data.total).toBe(1);
      expect(data.items[0]).toMatchObject({
        id: learner.id,
        email: learner.email,
        role: 'learner',
        email_verified: true,
        disabled: false,
      });

      const wildcard = await asAdmin.rpc('admin_list_users', listArgs('%'));
      expect(wildcard.error).toBeNull();
      expect(wildcard.data.items).toEqual([]);
    });

    it('rejects an unknown status and a bad page (22023)', async () => {
      const status = await asAdmin.rpc('admin_list_users', {
        ...listArgs(null),
        p_status: 'banned',
      });
      expect(status.error?.code).toBe('22023');
      const page = await asAdmin.rpc('admin_list_users', {
        ...listArgs(null),
        p_limit: 1000,
      });
      expect(page.error?.code).toBe('22023');
    });

    it('cannot change their own role (P0001 self)', async () => {
      const { error } = await asAdmin.rpc('admin_set_role', {
        p_user_id: admin.id,
        p_role: 'learner',
      });
      expect(error).toMatchObject({ code: 'P0001', hint: 'self' });
    });

    it('changes a role and writes one audit row', async () => {
      const target = await users.create('users-target');
      const promote = await asAdmin.rpc('admin_set_role', {
        p_user_id: target.id,
        p_role: 'admin',
      });
      expect(promote.error).toBeNull();
      // Same role again: no-op, no second row.
      await asAdmin.rpc('admin_set_role', {
        p_user_id: target.id,
        p_role: 'admin',
      });

      const { data } = await asAdmin
        .from('admin_audit_log')
        .select('actor_id, action, from_value, to_value')
        .eq('target_id', target.id);
      expect(data).toEqual([
        {
          actor_id: admin.id,
          action: 'role_changed',
          from_value: 'learner',
          to_value: 'admin',
        },
      ]);
    });

    it('audit rows cannot be changed or deleted, even by an admin', async () => {
      const update = await asAdmin
        .from('admin_audit_log')
        .update({ to_value: 'learner' })
        .eq('actor_id', admin.id);
      expect(update.error?.code).toBe('42501');
      const del = await asAdmin
        .from('admin_audit_log')
        .delete()
        .eq('actor_id', admin.id);
      expect(del.error?.code).toBe('42501');
    });

    it('404-like P0002 for an unknown user', async () => {
      const { error } = await asAdmin.rpc('admin_set_role', {
        p_user_id: '00000000-0000-4000-8000-000000000000',
        p_role: 'admin',
      });
      expect(error?.code).toBe('P0002');
    });
  });

  describe('a real ban', () => {
    it('blocks sign-in and refresh; the log only records what is true', async () => {
      const target = await users.create('users-ban');
      const client = anonClient();
      const signedIn = await client.auth.signInWithPassword({
        email: target.email,
        password: PASSWORD,
      });
      expect(signedIn.error).toBeNull();
      const refreshToken = signedIn.data.session!.refresh_token;

      // Logging a disable that has not happened is refused.
      const early = await asAdmin.rpc('admin_log_status_change', {
        p_user_id: target.id,
        p_disabled: true,
      });
      expect(early.error).toMatchObject({ code: 'P0001', hint: 'state' });

      const ban = await serviceClient().auth.admin.updateUserById(target.id, {
        ban_duration: '876000h',
      });
      expect(ban.error).toBeNull();

      const login = await anonClient().auth.signInWithPassword({
        email: target.email,
        password: PASSWORD,
      });
      expect(login.error).not.toBeNull();
      const refresh = await anonClient().auth.refreshSession({
        refresh_token: refreshToken,
      });
      expect(refresh.error).not.toBeNull();

      const logged = await asAdmin.rpc('admin_log_status_change', {
        p_user_id: target.id,
        p_disabled: true,
      });
      expect(logged.error).toBeNull();
      const row = await asAdmin.rpc('admin_get_user', {
        p_user_id: target.id,
      });
      expect(row.data[0]).toMatchObject({ disabled: true });

      // A disabled account is not promoted.
      const promote = await asAdmin.rpc('admin_set_role', {
        p_user_id: target.id,
        p_role: 'admin',
      });
      expect(promote.error).toMatchObject({ code: 'P0001', hint: 'disabled' });

      const unban = await serviceClient().auth.admin.updateUserById(target.id, {
        ban_duration: 'none',
      });
      expect(unban.error).toBeNull();
      const again = await anonClient().auth.signInWithPassword({
        email: target.email,
        password: PASSWORD,
      });
      expect(again.error).toBeNull();
    });
  });
});
