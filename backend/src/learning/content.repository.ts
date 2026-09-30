import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

/** Row of `public.skills`. */
export interface SkillRow {
  id: string;
  code: string;
  name: string;
  description: string;
  order_index: number;
}

/** Row of `public.courses` (columns learners need). */
export interface CourseRow {
  id: string;
  skill_id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
}

/** Row of `public.modules` (columns learners need). */
export interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

/** Row of `public.lessons` without the Markdown body. */
export interface LessonSummaryRow {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
  order_index: number;
}

export interface LessonRow extends LessonSummaryRow {
  content_md: string;
}

const SKILL_COLUMNS = 'id, code, name, description, order_index';
const COURSE_COLUMNS = 'id, skill_id, slug, title, description, order_index';
const MODULE_COLUMNS = 'id, course_id, title, description, order_index';
const LESSON_SUMMARY_COLUMNS =
  'id, module_id, slug, title, estimated_minutes, order_index';
const LESSON_COLUMNS = `${LESSON_SUMMARY_COLUMNS}, content_md`;

/**
 * Read-only access to learning content, as the user (RLS applies). Every
 * query also filters on `status = 'published'`: RLS lets admins read drafts,
 * but learner endpoints must show admins what learners see.
 */
@Injectable()
export class ContentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async listSkills(accessToken: string): Promise<SkillRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('skills')
      .select(SKILL_COLUMNS)
      .order('order_index')
      .order('code')
      .overrideTypes<SkillRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async listCourses(
    accessToken: string,
    filter: { skillId?: string; slug?: string; ids?: string[] } = {},
  ): Promise<CourseRow[]> {
    let query = this.supabase
      .forUser(accessToken)
      .from('courses')
      .select(COURSE_COLUMNS)
      .eq('status', 'published');
    if (filter.skillId) query = query.eq('skill_id', filter.skillId);
    if (filter.slug) query = query.eq('slug', filter.slug);
    if (filter.ids) query = query.in('id', filter.ids);
    const { data, error } = await query
      .order('order_index')
      .order('title')
      .overrideTypes<CourseRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async listModules(
    accessToken: string,
    courseIds: string[],
  ): Promise<ModuleRow[]> {
    if (courseIds.length === 0) return [];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('modules')
      .select(MODULE_COLUMNS)
      .eq('status', 'published')
      .in('course_id', courseIds)
      .order('order_index')
      .order('title')
      .overrideTypes<ModuleRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async listLessons(
    accessToken: string,
    moduleIds: string[],
  ): Promise<LessonSummaryRow[]> {
    if (moduleIds.length === 0) return [];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('lessons')
      .select(LESSON_SUMMARY_COLUMNS)
      .eq('status', 'published')
      .in('module_id', moduleIds)
      .order('order_index')
      .order('title')
      .overrideTypes<LessonSummaryRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  async findLesson(accessToken: string, id: string): Promise<LessonRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('lessons')
      .select(LESSON_COLUMNS)
      .eq('status', 'published')
      .eq('id', id)
      .maybeSingle<LessonRow>();
    if (error) throw error;
    return data;
  }

  async findModule(accessToken: string, id: string): Promise<ModuleRow | null> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('modules')
      .select(MODULE_COLUMNS)
      .eq('status', 'published')
      .eq('id', id)
      .maybeSingle<ModuleRow>();
    if (error) throw error;
    return data;
  }
}
