import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfigService } from '../config/app-config.service.js';

// The backend is stateless: clients must never persist or refresh sessions,
// otherwise one user's session could leak into another user's request.
const SERVER_AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

@Injectable()
export class SupabaseService {
  private serviceClient?: SupabaseClient;

  constructor(private readonly config: AppConfigService) {}

  /**
   * Client acting as the given user. Every query runs under that user's JWT,
   * so Row Level Security applies. Create one per request.
   */
  forUser(accessToken: string): SupabaseClient {
    return createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
      auth: SERVER_AUTH_OPTIONS,
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  /**
   * Fresh anonymous client for public auth calls (sign up, sign in, refresh).
   * A new instance per call keeps sessions isolated between requests.
   */
  anon(): SupabaseClient {
    return createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
      auth: SERVER_AUTH_OPTIONS,
    });
  }

  /**
   * Service-role client. Bypasses RLS — use only where strictly required
   * (grading with answer keys, revoking sessions). Never return its data
   * to clients without filtering.
   */
  service(): SupabaseClient {
    this.serviceClient ??= createClient(
      this.config.supabaseUrl,
      this.config.supabaseServiceRoleKey,
      { auth: SERVER_AUTH_OPTIONS },
    );
    return this.serviceClient;
  }
}
