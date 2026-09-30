import { Injectable } from '@nestjs/common';
import type { Difficulty, ExerciseType } from '../practice/exercise-schema.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { ContentKind, ContentStatus, Usage } from './content-rules.js';

interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface AdminCourseRow extends Timestamps {
  id: string;
  skill_id: string;
  slug: string;
  title: string;
  description: string;
  status: ContentStatus;
  order_index: number;
}

export interface AdminModuleRow extends Timestamps {
  id: string;
  course_id: string;
  title: string;
  description: string;
  status: ContentStatus;
  order_index: number;
}

export interface AdminLessonSummaryRow extends Timestamps {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
  status: ContentStatus;
  order_index: number;
}

export interface AdminLessonRow extends AdminLessonSummaryRow {
  content_md: string;
}

export interface AdminExerciseRow extends Timestamps {
  id: string;
  lesson_id: string;
  type: ExerciseType;
  question: string;
  prompt_data: unknown;
  difficulty: Difficulty;
  status: ContentStatus;
  order_index: number;
}

export interface AdminAnswerRow {
  answer_data: unknown;
  explanation: string;
}

/** Columns a client may write, per kind (the DB grants the same ones). */
export interface WriteByKind {
  course: Pick<
    AdminCourseRow,
    'skill_id' | 'title' | 'slug' | 'description' | 'status' | 'order_index'
  >;
  module: Pick<
    AdminModuleRow,
    'course_id' | 'title' | 'description' | 'status' | 'order_index'
  >;
  lesson: Pick<
    AdminLessonRow,
    | 'module_id'
    | 'title'
    | 'slug'
    | 'content_md'
    | 'estimated_minutes'
    | 'status'
    | 'order_index'
  >;
  exercise: Pick<
    AdminExerciseRow,
    | 'lesson_id'
    | 'type'
    | 'question'
    | 'prompt_data'
    | 'difficulty'
    | 'status'
    | 'order_index'
  >;
}

/** Updatable columns: the parent and an exercise's type never change. */
export interface UpdateByKind {
  course: Partial<WriteByKind['course']>;
  module: Partial<Omit<WriteByKind['module'], 'course_id'>>;
  lesson: Partial<Omit<WriteByKind['lesson'], 'module_id'>>;
  exercise: Partial<Omit<WriteByKind['exercise'], 'lesson_id' | 'type'>>;
}

export interface RowByKind {
  course: AdminCourseRow;
  module: AdminModuleRow;
  lesson: AdminLessonRow;
  exercise: AdminExerciseRow;
}

const TIMESTAMPS = 'created_at, updated_at';
const COURSE_COLUMNS = `id, skill_id, slug, title, description, status, order_index, ${TIMESTAMPS}`;
const MODULE_COLUMNS = `id, course_id, title, description, status, order_index, ${TIMESTAMPS}`;
const LESSON_SUMMARY_COLUMNS = `id, module_id, slug, title, estimated_minutes, status, order_index, ${TIMESTAMPS}`;
const LESSON_COLUMNS = `${LESSON_SUMMARY_COLUMNS}, content_md`;
const EXERCISE_COLUMNS = `id, lesson_id, type, question, prompt_data, difficulty, status, order_index, ${TIMESTAMPS}`;

const TABLES: Record<ContentKind, { table: string; columns: string }> = {
  course: { table: 'courses', columns: COURSE_COLUMNS },
  module: { table: 'modules', columns: MODULE_COLUMNS },
  lesson: { table: 'lessons', columns: LESSON_COLUMNS },
  exercise: { table: 'exercises', columns: EXERCISE_COLUMNS },
};

/**
 * Content for the Admin CMS, every status, as the signed-in admin: RLS
 * (`is_admin()`) allows the reads and writes, the backend's RolesGuard has
 * already checked the role. Supabase errors are thrown as they are (the
 * service maps unique / foreign-key violations to 409).
 */
@Injectable()
export class AdminContentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async listCourses(
    accessToken: string,
    filter: { skillId?: string; status?: ContentStatus } = {},
  ): Promise<AdminCourseRow[]> {
    let query = this.supabase
      .forUser(accessToken)
      .from('courses')
      .select(COURSE_COLUMNS);
    if (filter.skillId) query = query.eq('skill_id', filter.skillId);
    if (filter.status) query = query.eq('status', filter.status);
    const { data, error } = await query
      .order('order_index')
      .order('title')
      .overrideTypes<AdminCourseRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async listModules(
    accessToken: string,
    courseIds: string[],
  ): Promise<AdminModuleRow[]> {
    return this.listChildren(accessToken, 'modules', MODULE_COLUMNS, {
      column: 'course_id',
      ids: courseIds,
    });
  }

  async listLessons(
    accessToken: string,
    moduleIds: string[],
  ): Promise<AdminLessonSummaryRow[]> {
    return this.listChildren(accessToken, 'lessons', LESSON_SUMMARY_COLUMNS, {
      column: 'module_id',
      ids: moduleIds,
    });
  }

  async listExercises(
    accessToken: string,
    lessonIds: string[],
  ): Promise<AdminExerciseRow[]> {
    return this.listChildren(accessToken, 'exercises', EXERCISE_COLUMNS, {
      column: 'lesson_id',
      ids: lessonIds,
    });
  }

  async find<K extends ContentKind>(
    accessToken: string,
    kind: K,
    id: string,
  ): Promise<RowByKind[K] | null> {
    const { table, columns } = TABLES[kind];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from(table)
      .select(columns)
      .eq('id', id)
      .maybeSingle<RowByKind[K]>();
    if (error) throw error;
    return data;
  }

  async insert<K extends ContentKind>(
    accessToken: string,
    kind: K,
    row: WriteByKind[K],
  ): Promise<RowByKind[K]> {
    const { table, columns } = TABLES[kind];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from(table)
      .insert(row)
      .select(columns)
      .single<RowByKind[K]>();
    if (error) throw error;
    return data;
  }

  /** Null when the row does not exist. */
  async update<K extends ContentKind>(
    accessToken: string,
    kind: K,
    id: string,
    patch: UpdateByKind[K],
  ): Promise<RowByKind[K] | null> {
    const { table, columns } = TABLES[kind];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from(table)
      .update(patch)
      .eq('id', id)
      .select(columns)
      .maybeSingle<RowByKind[K]>();
    if (error) throw error;
    return data;
  }

  /**
   * Hard delete (children cascade). Fails with 23503 when learner progress
   * or attempts reference the row or its children. False when not found.
   */
  async remove(
    accessToken: string,
    kind: ContentKind,
    id: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from(TABLES[kind].table)
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  /** The answer key, read as the admin (RLS: admins only). */
  async findAnswer(
    accessToken: string,
    exerciseId: string,
  ): Promise<AdminAnswerRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_answers')
      .select('answer_data, explanation')
      .eq('exercise_id', exerciseId)
      .maybeSingle<AdminAnswerRow>();
    if (error) throw error;
    return data;
  }

  async saveAnswer(
    accessToken: string,
    exerciseId: string,
    answer: AdminAnswerRow,
  ): Promise<void> {
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('exercise_answers')
      .upsert(
        { exercise_id: exerciseId, ...answer },
        {
          onConflict: 'exercise_id',
        },
      );
    if (error) throw error;
  }

  /** `order_index` = position in `ids`, in one statement (`reorder_content`). */
  async reorder(
    accessToken: string,
    kind: ContentKind,
    parentId: string,
    ids: string[],
  ): Promise<void> {
    const { error } = await this.supabase
      .forUser(accessToken)
      .rpc('reorder_content', {
        p_kind: kind,
        p_parent_id: parentId,
        p_ids: ids,
      });
    if (error) throw error;
  }

  /** Lessons with learner progress and exercises with attempts. */
  async usage(
    accessToken: string,
    lessonIds: string[],
    exerciseIds: string[],
  ): Promise<Usage> {
    const usage = { lessons: new Set<string>(), exercises: new Set<string>() };
    if (lessonIds.length === 0 && exerciseIds.length === 0) return usage;
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .rpc('content_usage', {
        p_lesson_ids: lessonIds,
        p_exercise_ids: exerciseIds,
      });
    if (error) throw error;
    const rows = (data ?? []) as { kind: 'lesson' | 'exercise'; id: string }[];
    for (const row of rows) {
      (row.kind === 'lesson' ? usage.lessons : usage.exercises).add(row.id);
    }
    return usage;
  }

  private async listChildren<T>(
    accessToken: string,
    table: string,
    columns: string,
    parent: { column: string; ids: string[] },
  ): Promise<T[]> {
    if (parent.ids.length === 0) return [];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from(table)
      .select(columns)
      .in(parent.column, parent.ids)
      .order('order_index')
      .order('id')
      .overrideTypes<T[], { merge: false }>();
    if (error) throw error;
    return data;
  }
}
