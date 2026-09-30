import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

/** Row of `public.exercise_answers`: the answer key. Never returned as is. */
export interface ExerciseAnswerRow {
  answer_data: unknown;
  explanation: string;
}

/**
 * Answer keys, read with the service role: no API role may read them (only
 * admins, through RLS, for the Admin CMS). Callers must never return the row.
 */
@Injectable()
export class ExerciseAnswersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async find(exerciseId: string): Promise<ExerciseAnswerRow | null> {
    const { data, error } = await this.supabase
      .service()
      .from('exercise_answers')
      .select('answer_data, explanation')
      .eq('exercise_id', exerciseId)
      .maybeSingle<ExerciseAnswerRow>();
    if (error) throw error;
    return data;
  }
}
