import { Injectable } from '@nestjs/common';
import type { ContentStatus } from '../admin/content-rules.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { LessonText } from './glossary-rules.js';

export interface GlossaryRow {
  id: string;
  slug: string;
  term: string;
  vi_name: string | null;
  skill_code: string;
  match_phrases: string[];
  definition_en: string;
  definition_vi: string;
  related_ids: string[];
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

/** Columns an admin may write (the DB grants the same ones). */
export type GlossaryWrite = Pick<
  GlossaryRow,
  | 'slug'
  | 'term'
  | 'vi_name'
  | 'skill_code'
  | 'match_phrases'
  | 'definition_en'
  | 'definition_vi'
  | 'related_ids'
  | 'status'
>;

export interface CourseTitleRow {
  id: string;
  title: string;
}

const COLUMNS =
  'id, slug, term, vi_name, skill_code, match_phrases, definition_en, definition_vi, related_ids, status, created_at, updated_at';

/** `glossary_terms`, always as the caller (RLS: learners see published rows). */
@Injectable()
export class GlossaryRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(
    accessToken: string,
    options: { publishedOnly: boolean },
  ): Promise<GlossaryRow[]> {
    let query = this.supabase
      .forUser(accessToken)
      .from('glossary_terms')
      .select(COLUMNS);
    if (options.publishedOnly) query = query.eq('status', 'published');
    const { data, error } = await query
      .order('term')
      .overrideTypes<GlossaryRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async find(accessToken: string, id: string): Promise<GlossaryRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('glossary_terms')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle<GlossaryRow>();
    if (error) throw error;
    return data;
  }

  async insert(accessToken: string, row: GlossaryWrite): Promise<GlossaryRow> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('glossary_terms')
      .insert(row)
      .select(COLUMNS)
      .single<GlossaryRow>();
    if (error) throw error;
    return data;
  }

  async update(
    accessToken: string,
    id: string,
    patch: Partial<GlossaryWrite>,
  ): Promise<GlossaryRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('glossary_terms')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle<GlossaryRow>();
    if (error) throw error;
    return data;
  }

  /** True when a row was deleted. */
  async remove(accessToken: string, id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('glossary_terms')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  /** Every lesson's English Markdown with its course (admin: all statuses). */
  async listLessonTexts(accessToken: string): Promise<LessonText[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('lessons')
      .select('id, content_md, modules!inner(course_id)')
      .overrideTypes<
        { id: string; content_md: string; modules: { course_id: string } }[],
        { merge: false }
      >();
    if (error) throw error;
    return data.map((row) => ({
      lessonId: row.id,
      courseId: row.modules.course_id,
      contentMd: row.content_md,
    }));
  }

  async listCourseTitles(accessToken: string): Promise<CourseTitleRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('courses')
      .select('id, title')
      .order('title')
      .overrideTypes<CourseTitleRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }
}
