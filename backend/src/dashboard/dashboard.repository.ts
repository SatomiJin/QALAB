import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { ExerciseResultRow, SkillProgressRow } from './stats.js';

export const ACTIVITY_KINDS = [
  'lesson_started',
  'lesson_completed',
  'exercise_attempted',
] as const;
/** Kinds shown in the activity list (`lesson_visited` counts for the streak only). */
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Row of `public.v_user_activity` (visible, listed kinds only). */
export interface ActivityRow {
  kind: ActivityKind;
  occurred_at: string;
  lesson_id: string | null;
  exercise_id: string | null;
  attempt_id: string | null;
  score: number | null;
  is_correct: boolean | null;
}

const SKILL_COLUMNS =
  'skill_id, skill_code, skill_name, skill_order, total_lessons, completed_lessons, started_lessons, total_exercises, attempted_exercises, passed_exercises, average_score';
const RESULT_COLUMNS =
  'exercise_id, attempt_count, best_score, last_score, last_attempted_at, passed, best_feedback';
const ACTIVITY_COLUMNS =
  'kind, occurred_at, lesson_id, exercise_id, attempt_id, score, is_correct';

/**
 * Derived learner data (the dashboard views), read as the user: the views are
 * security invoker, so RLS limits them to the user's own rows. Every query
 * also filters on the user id, because an admin's RLS shows everyone.
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly supabase: SupabaseService) {}

  /** One row per skill, in skill order. */
  async listSkillProgress(
    accessToken: string,
    userId: string,
  ): Promise<SkillProgressRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('v_user_skill_progress')
      .select(SKILL_COLUMNS)
      .eq('user_id', userId)
      .order('skill_order')
      .order('skill_code')
      .overrideTypes<SkillProgressRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /** Best result per attempted exercise (any status; callers filter). */
  async listExerciseResults(
    accessToken: string,
    userId: string,
  ): Promise<ExerciseResultRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('v_user_exercise_results')
      .select(RESULT_COLUMNS)
      .eq('user_id', userId)
      .overrideTypes<ExerciseResultRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /** The latest events on content that is still published, newest first. */
  async listRecentActivity(
    accessToken: string,
    userId: string,
    limit: number,
  ): Promise<ActivityRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('v_user_activity')
      .select(ACTIVITY_COLUMNS)
      .eq('user_id', userId)
      .eq('visible', true)
      .in('kind', [...ACTIVITY_KINDS])
      .order('occurred_at', { ascending: false })
      .limit(limit)
      .overrideTypes<ActivityRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /**
   * Days (`YYYY-MM-DD`) with any activity of the caller in this time zone,
   * newest first. The zone must be valid (the SQL function raises otherwise).
   */
  async listActivityDays(
    accessToken: string,
    timeZone: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .rpc('activity_days', { p_time_zone: timeZone });
    if (error) throw error;
    return (data ?? []) as string[];
  }
}
