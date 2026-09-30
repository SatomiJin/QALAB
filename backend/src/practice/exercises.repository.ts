import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { Difficulty, ExerciseType } from './exercise-schema.js';

/** Row of `public.exercises` (public columns only). */
export interface ExerciseRow {
  id: string;
  lesson_id: string;
  type: ExerciseType;
  question: string;
  prompt_data: unknown;
  difficulty: Difficulty;
  order_index: number;
}

export interface ExerciseFilter {
  types?: ExerciseType[];
  difficulty?: Difficulty;
}

const COLUMNS =
  'id, lesson_id, type, question, prompt_data, difficulty, order_index';

/**
 * Exercises as the user (RLS: published, with a published lesson chain) plus
 * an explicit `status = 'published'` filter, so admins get the learner view.
 */
@Injectable()
export class ExercisesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async listForLessons(
    accessToken: string,
    lessonIds: string[],
    filter: ExerciseFilter = {},
  ): Promise<ExerciseRow[]> {
    if (lessonIds.length === 0) return [];
    let query = this.supabase
      .forUser(accessToken)
      .from('exercises')
      .select(COLUMNS)
      .eq('status', 'published')
      .in('lesson_id', lessonIds);
    if (filter.types) query = query.in('type', filter.types);
    if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);
    const { data, error } = await query
      .order('order_index')
      .order('id')
      .overrideTypes<ExerciseRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async find(accessToken: string, id: string): Promise<ExerciseRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercises')
      .select(COLUMNS)
      .eq('status', 'published')
      .eq('id', id)
      .maybeSingle<ExerciseRow>();
    if (error) throw error;
    return data;
  }
}
