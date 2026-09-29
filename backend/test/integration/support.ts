import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export const PASSWORD = 'integration-Pass-123';

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    options,
  );
}

export function anonClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    options,
  );
}

export function testEmail(label: string): string {
  return `qalab-it-${label}-${randomBytes(4).toString('hex')}@example.com`;
}

/**
 * Creates and tracks test users. Users are made with the admin API, so no
 * email is sent and Supabase's email rate limit is not touched.
 */
export class TestUsers {
  private readonly ids: string[] = [];
  private readonly admin = serviceClient();

  async create(
    label: string,
    { confirmed = true, displayName = `IT ${label}` } = {},
  ): Promise<{ id: string; email: string }> {
    const email = testEmail(label);
    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: confirmed,
      user_metadata: { display_name: displayName },
    });
    if (error) throw error;
    this.ids.push(data.user.id);
    return { id: data.user.id, email };
  }

  /** Signup through a generated link: returns the token hash of the email. */
  async signupLink(
    label: string,
  ): Promise<{ email: string; tokenHash: string }> {
    const email = testEmail(label);
    const { data, error } = await this.admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password: PASSWORD,
      options: { data: { display_name: `IT ${label}` } },
    });
    if (error) throw error;
    this.ids.push(data.user.id);
    return { email, tokenHash: data.properties.hashed_token };
  }

  async recoveryLink(email: string): Promise<string> {
    const { data, error } = await this.admin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (error) throw error;
    return data.properties.hashed_token;
  }

  async setRole(id: string, role: 'learner' | 'admin'): Promise<void> {
    const { error } = await this.admin
      .from('profiles')
      .update({ role })
      .eq('id', id);
    if (error) throw error;
  }

  /** A client signed in as the user: every query goes through RLS. */
  async signIn(email: string): Promise<SupabaseClient> {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (error) throw error;
    return client;
  }

  async cleanup(): Promise<void> {
    await Promise.all(
      this.ids.map((id) => this.admin.auth.admin.deleteUser(id)),
    );
  }
}
