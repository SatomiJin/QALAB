import { Injectable } from '@nestjs/common';
import type { UserRole } from '../auth/decorators/roles.decorator.js';
import { SupabaseService } from '../supabase/supabase.service.js';

export const EXPERIENCE_LEVELS = [
  'beginner',
  'some_qa',
  'working_qa',
  'automation_qa',
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Row of `public.profiles`. */
export interface ProfileRow {
  id: string;
  display_name: string;
  experience_level: ExperienceLevel | null;
  learning_goals: string[];
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/** Columns a user may change. `role` is not one of them (see migration). */
export type ProfilePatch = Partial<
  Pick<ProfileRow, 'display_name' | 'experience_level' | 'learning_goals'>
>;

const COLUMNS =
  'id, display_name, experience_level, learning_goals, role, created_at, updated_at';

/**
 * Data access for `profiles`. Every query runs as the user (RLS applies),
 * so a user can only ever read or change their own row.
 */
@Injectable()
export class ProfilesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findById(accessToken: string, id: string): Promise<ProfileRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('profiles')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data;
  }

  async update(
    accessToken: string,
    id: string,
    patch: ProfilePatch,
  ): Promise<ProfileRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data;
  }
}
