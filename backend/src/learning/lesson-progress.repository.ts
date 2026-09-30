import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export const LESSON_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Row of `public.lesson_progress` (columns the API uses). */
export interface LessonProgressRow {
  lesson_id: string;
  status: LessonStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string;
}

/** Values written by an upsert. The DB trigger keeps progress forward-only. */
export type LessonProgressWrite = LessonProgressRow & { user_id: string };

const COLUMNS =
  'lesson_id, status, progress_percent, started_at, completed_at, last_accessed_at';

/**
 * Data access for `lesson_progress`, as the user. RLS limits every query to
 * the user's own rows and to published lessons.
 */
@Injectable()
export class LessonProgressRepository {
  constructor(private readonly supabase: SupabaseService) {}

  /** The user's progress rows, most recently accessed first. */
  async listForUser(
    accessToken: string,
    userId: string,
    lessonIds?: string[],
  ): Promise<LessonProgressRow[]> {
    if (lessonIds && lessonIds.length === 0) return [];
    let query = this.supabase
      .forUser(accessToken)
      .from('lesson_progress')
      .select(COLUMNS)
      .eq('user_id', userId);
    if (lessonIds) query = query.in('lesson_id', lessonIds);
    const { data, error } = await query
      .order('last_accessed_at', { ascending: false })
      .overrideTypes<LessonProgressRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async find(
    accessToken: string,
    userId: string,
    lessonId: string,
  ): Promise<LessonProgressRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('lesson_progress')
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle<LessonProgressRow>();
    if (error) throw error;
    return data;
  }

  async upsert(
    accessToken: string,
    row: LessonProgressWrite,
  ): Promise<LessonProgressRow> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('lesson_progress')
      .upsert(row, { onConflict: 'user_id,lesson_id' })
      .select(COLUMNS)
      .single<LessonProgressRow>();
    if (error) throw error;
    return data;
  }
}
