import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

/** Long enough to mean "until enabled again" (about 100 years). */
export const BAN_DURATION = '876000h';

/**
 * Account status in Supabase Auth, through its admin API. That API needs the
 * service role: this is the only thing user management does with it. Callers
 * check the admin and the rules first.
 */
@Injectable()
export class UserAccountsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Bans or unbans the account. A banned user cannot sign in or refresh a
   * session; access tokens already issued expire within the hour.
   */
  async setDisabled(id: string, disabled: boolean): Promise<void> {
    const { error } = await this.supabase
      .service()
      .auth.admin.updateUserById(id, {
        ban_duration: disabled ? BAN_DURATION : 'none',
      });
    if (error) throw error;
  }
}
