import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { SelfAssessment } from './exercise-schema.js';
import type { Feedback } from './grading.js';

/** Row of `public.exercise_attempts`. */
export interface AttemptRow {
  id: string;
  exercise_id: string;
  answer: unknown;
  score: number;
  is_correct: boolean;
  feedback: Feedback;
  self_assessment: SelfAssessment | null;
  attempted_at: string;
}

/** Just enough to summarise a learner's attempts per exercise. */
export type AttemptScoreRow = Pick<
  AttemptRow,
  'exercise_id' | 'score' | 'is_correct' | 'attempted_at'
>;

/** A graded attempt, written by the backend. */
export interface AttemptWrite {
  user_id: string;
  exercise_id: string;
  answer: unknown;
  score: number;
  is_correct: boolean;
  feedback: Feedback;
}

const COLUMNS =
  'id, exercise_id, answer, score, is_correct, feedback, self_assessment, attempted_at';

/**
 * Attempts. Reads and the self-assessment run as the user (RLS: own rows).
 * Graded attempts are inserted with the service role: no API role may write
 * a score.
 */
@Injectable()
export class AttemptsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async insert(row: AttemptWrite): Promise<AttemptRow> {
    const { data, error } = await this.supabase
      .service()
      .from('exercise_attempts')
      .insert(row)
      .select(COLUMNS)
      .single<AttemptRow>();
    if (error) throw error;
    return data;
  }

  /** One page of the user's attempts at an exercise, newest first. */
  async listForExercise(
    accessToken: string,
    userId: string,
    exerciseId: string,
    { offset, limit }: { offset: number; limit: number },
  ): Promise<{ rows: AttemptRow[]; total: number }> {
    const { data, error, count } = await this.supabase
      .forUser(accessToken)
      .from('exercise_attempts')
      .select(COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('attempted_at', { ascending: false })
      .order('id')
      .range(offset, offset + limit - 1)
      .overrideTypes<AttemptRow[], { merge: false }>();
    if (error) throw error;
    return { rows: data, total: count ?? 0 };
  }

  /** Scores of the user's attempts at these exercises, newest first. */
  async listScores(
    accessToken: string,
    userId: string,
    exerciseIds: string[],
  ): Promise<AttemptScoreRow[]> {
    if (exerciseIds.length === 0) return [];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_attempts')
      .select('exercise_id, score, is_correct, attempted_at')
      .eq('user_id', userId)
      .in('exercise_id', exerciseIds)
      .order('attempted_at', { ascending: false })
      .overrideTypes<AttemptScoreRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async find(
    accessToken: string,
    userId: string,
    attemptId: string,
  ): Promise<AttemptRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_attempts')
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('id', attemptId)
      .maybeSingle<AttemptRow>();
    if (error) throw error;
    return data;
  }

  /**
   * Saves the self-assessment once. Returns null when it was already saved
   * (the row is unchanged; the DB trigger refuses a second write too).
   */
  async saveSelfAssessment(
    accessToken: string,
    userId: string,
    attemptId: string,
    selfAssessment: SelfAssessment,
  ): Promise<AttemptRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_attempts')
      .update({ self_assessment: selfAssessment })
      .eq('user_id', userId)
      .eq('id', attemptId)
      .is('self_assessment', null)
      .select(COLUMNS)
      .maybeSingle<AttemptRow>();
    if (error) throw error;
    return data;
  }
}
