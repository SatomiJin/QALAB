import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, serviceClient, TestUsers } from './support.js';

/**
 * RLS on `profiles`, tested directly against the database (no backend), as
 * an attacker holding a valid user JWT and the public anon key would.
 */
describe('profiles RLS (integration)', () => {
  const users = new TestUsers();
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let asAlice: SupabaseClient;

  beforeAll(async () => {
    alice = await users.create('alice', { displayName: 'Alice' });
    bob = await users.create('bob', { displayName: 'Bob' });
    asAlice = await users.signIn(alice.email);
  });

  afterAll(async () => {
    await users.cleanup();
  });

  it('creates a learner profile for every new auth user (trigger)', async () => {
    const { data, error } = await serviceClient()
      .from('profiles')
      .select('display_name, role, learning_goals, experience_level')
      .eq('id', alice.id)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      display_name: 'Alice',
      role: 'learner',
      learning_goals: [],
      experience_level: null,
    });
  });

  it('lets a user read only their own profile', async () => {
    const { data, error } = await asAlice.from('profiles').select('id');

    expect(error).toBeNull();
    expect(data).toEqual([{ id: alice.id }]);
  });

  it('hides other users profiles', async () => {
    const { data } = await asAlice
      .from('profiles')
      .select('id')
      .eq('id', bob.id)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it('lets a user update their own editable fields', async () => {
    const { data, error } = await asAlice
      .from('profiles')
      .update({ display_name: 'Alice 2', learning_goals: ['BVA'] })
      .eq('id', alice.id)
      .select('display_name, learning_goals')
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({ display_name: 'Alice 2', learning_goals: ['BVA'] });
  });

  it('does not let a user update another profile', async () => {
    const { data } = await asAlice
      .from('profiles')
      .update({ display_name: 'hacked' })
      .eq('id', bob.id)
      .select('id');

    expect(data).toEqual([]);
    const { data: bobRow } = await serviceClient()
      .from('profiles')
      .select('display_name')
      .eq('id', bob.id)
      .single();
    expect(bobRow?.display_name).toBe('Bob');
  });

  it('does not let a user change their own role', async () => {
    const { error } = await asAlice
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', alice.id);

    expect(error?.code).toBe('42501'); // insufficient_privilege
    const { data } = await serviceClient()
      .from('profiles')
      .select('role')
      .eq('id', alice.id)
      .single();
    expect(data?.role).toBe('learner');
  });

  it.each(['id', 'created_at'])(
    'does not let a user change %s',
    async (column) => {
      const { error } = await asAlice
        .from('profiles')
        .update({
          [column]: column === 'id' ? bob.id : '2000-01-01T00:00:00Z',
        })
        .eq('id', alice.id);

      expect(error?.code).toBe('42501');
    },
  );

  it('does not let a user insert or delete profiles', async () => {
    const insert = await asAlice
      .from('profiles')
      .insert({ id: bob.id, display_name: 'x' });
    const remove = await asAlice.from('profiles').delete().eq('id', alice.id);

    expect(insert.error?.code).toBe('42501');
    expect(remove.error?.code).toBe('42501');
  });

  it('enforces the display name constraint in the database', async () => {
    const { error } = await asAlice
      .from('profiles')
      .update({ display_name: '   ' })
      .eq('id', alice.id);

    expect(error?.code).toBe('23514'); // check_violation
  });

  it('gives the anon key no access at all', async () => {
    const { data, error } = await anonClient().from('profiles').select('id');

    expect(data ?? []).toEqual([]);
    expect(error?.code ?? '42501').toBe('42501');
  });

  describe('admin', () => {
    let asAdmin: SupabaseClient;
    let admin: { id: string; email: string };

    beforeAll(async () => {
      admin = await users.create('admin', { displayName: 'Admin' });
      await users.setRole(admin.id, 'admin');
      asAdmin = await users.signIn(admin.email);
    });

    it('is_admin() is true only for admins', async () => {
      const forAdmin = await asAdmin.rpc('is_admin');
      const forLearner = await asAlice.rpc('is_admin');

      expect(forAdmin.data).toBe(true);
      expect(forLearner.data).toBe(false);
    });

    it('can read every profile', async () => {
      const { data } = await asAdmin
        .from('profiles')
        .select('id')
        .in('id', [alice.id, bob.id]);

      expect(data).toHaveLength(2);
    });

    it('cannot change roles through the API either', async () => {
      const { error } = await asAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', bob.id);

      expect(error?.code).toBe('42501');
    });

    it('cannot update another user profile', async () => {
      const { data } = await asAdmin
        .from('profiles')
        .update({ display_name: 'by admin' })
        .eq('id', bob.id)
        .select('id');

      expect(data).toEqual([]);
    });
  });
});
