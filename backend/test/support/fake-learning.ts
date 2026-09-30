import { randomUUID } from 'node:crypto';
import type {
  CourseRow,
  LessonRow,
  LessonSummaryRow,
  ModuleRow,
  SkillRow,
} from '../../src/learning/content.repository.js';
import type {
  LessonProgressRow,
  LessonProgressWrite,
} from '../../src/learning/lesson-progress.repository.js';

export type Status = 'draft' | 'published' | 'archived';

export interface Stored<T> {
  row: T;
  status: Status;
}

const byOrder = <T extends { order_index: number; title: string }>(
  a: T,
  b: T,
) => a.order_index - b.order_index || a.title.localeCompare(b.title);

/**
 * In-memory `ContentRepository`. Like the real one, every query returns only
 * published rows (the real one filters on status on top of RLS).
 */
export class FakeContentRepository {
  readonly skills: SkillRow[] = [];
  readonly courses = new Map<string, Stored<CourseRow>>();
  readonly modules = new Map<string, Stored<ModuleRow>>();
  readonly lessons = new Map<string, Stored<LessonRow>>();

  addSkill(code: string, order_index = this.skills.length + 1): SkillRow {
    const skill = {
      id: randomUUID(),
      code,
      name: `Skill ${code}`,
      description: '',
      order_index,
    };
    this.skills.push(skill);
    return skill;
  }

  addCourse(
    skill: SkillRow,
    slug: string,
    { status = 'published' as Status, order_index = 1 } = {},
  ): CourseRow {
    const row = {
      id: randomUUID(),
      skill_id: skill.id,
      slug,
      title: `Course ${slug}`,
      description: `About ${slug}`,
      order_index,
    };
    this.courses.set(row.id, { row, status });
    return row;
  }

  addModule(
    course: CourseRow,
    title: string,
    { status = 'published' as Status, order_index = 1 } = {},
  ): ModuleRow {
    const row = {
      id: randomUUID(),
      course_id: course.id,
      title,
      description: '',
      order_index,
    };
    this.modules.set(row.id, { row, status });
    return row;
  }

  addLesson(
    module: ModuleRow,
    slug: string,
    {
      status = 'published' as Status,
      order_index = 1,
      estimated_minutes = 5,
    } = {},
  ): LessonRow {
    const row = {
      id: randomUUID(),
      module_id: module.id,
      slug,
      title: `Lesson ${slug}`,
      estimated_minutes,
      order_index,
      content_md: `# ${slug}\n\nBody of ${slug}.`,
    };
    this.lessons.set(row.id, { row, status });
    return row;
  }

  setStatus(id: string, status: Status): void {
    const entry =
      this.courses.get(id) ?? this.modules.get(id) ?? this.lessons.get(id);
    if (!entry) throw new Error(`No content ${id}`);
    entry.status = status;
  }

  /** Edits a lesson body, as an admin would. */
  setLessonContent(id: string, content_md: string): void {
    const entry = this.lessons.get(id);
    if (!entry) throw new Error(`No lesson ${id}`);
    entry.row = { ...entry.row, content_md };
  }

  /** The lesson, its module and its course are all published. */
  isLessonVisible(id: string): boolean {
    const lesson = this.lessons.get(id);
    const module = lesson && this.modules.get(lesson.row.module_id);
    const course = module && this.courses.get(module.row.course_id);
    return [lesson, module, course].every(
      (entry) => entry?.status === 'published',
    );
  }

  private published<T>(map: Map<string, Stored<T>>): T[] {
    return [...map.values()]
      .filter((entry) => entry.status === 'published')
      .map((entry) => entry.row);
  }

  async listSkills(_token: string): Promise<SkillRow[]> {
    return [...this.skills].sort((a, b) => a.order_index - b.order_index);
  }

  async listCourses(
    _token: string,
    filter: { skillId?: string; slug?: string; ids?: string[] } = {},
  ): Promise<CourseRow[]> {
    return this.published(this.courses)
      .filter((row) => !filter.skillId || row.skill_id === filter.skillId)
      .filter((row) => !filter.slug || row.slug === filter.slug)
      .filter((row) => !filter.ids || filter.ids.includes(row.id))
      .sort(byOrder);
  }

  async listModules(_token: string, courseIds: string[]): Promise<ModuleRow[]> {
    return this.published(this.modules)
      .filter((row) => courseIds.includes(row.course_id))
      .sort(byOrder);
  }

  async listLessons(
    _token: string,
    moduleIds: string[],
  ): Promise<LessonSummaryRow[]> {
    return this.published(this.lessons)
      .filter((row) => moduleIds.includes(row.module_id))
      .sort(byOrder)
      .map(({ content_md: _content, ...summary }) => summary);
  }

  async findLesson(_token: string, id: string): Promise<LessonRow | null> {
    const entry = this.lessons.get(id);
    return entry?.status === 'published' ? entry.row : null;
  }

  async findModule(_token: string, id: string): Promise<ModuleRow | null> {
    const entry = this.modules.get(id);
    return entry?.status === 'published' ? entry.row : null;
  }
}

/**
 * In-memory `LessonProgressRepository`. Rows are per user (as RLS makes
 * them), and writes follow the `lesson_progress_forward_only` trigger.
 */
export class FakeLessonProgressRepository {
  readonly rows = new Map<string, LessonProgressWrite>();

  private key(userId: string, lessonId: string) {
    return `${userId}:${lessonId}`;
  }

  private strip({ user_id: _user, ...row }: LessonProgressWrite) {
    return row as LessonProgressRow;
  }

  async listForUser(
    _token: string,
    userId: string,
    lessonIds?: string[],
  ): Promise<LessonProgressRow[]> {
    return [...this.rows.values()]
      .filter((row) => row.user_id === userId)
      .filter((row) => !lessonIds || lessonIds.includes(row.lesson_id))
      .sort((a, b) => b.last_accessed_at.localeCompare(a.last_accessed_at))
      .map((row) => this.strip(row));
  }

  async find(
    _token: string,
    userId: string,
    lessonId: string,
  ): Promise<LessonProgressRow | null> {
    const row = this.rows.get(this.key(userId, lessonId));
    return row ? this.strip(row) : null;
  }

  async upsert(
    _token: string,
    row: LessonProgressWrite,
  ): Promise<LessonProgressRow> {
    const key = this.key(row.user_id, row.lesson_id);
    const old = this.rows.get(key);
    const next = { ...row };
    if (old) {
      next.started_at = old.started_at ?? next.started_at;
      next.progress_percent = Math.max(
        old.progress_percent,
        next.progress_percent,
      );
      if (old.status === 'completed') {
        next.status = 'completed';
        next.completed_at = old.completed_at;
      }
    }
    if (next.status === 'completed') next.progress_percent = 100;
    this.rows.set(key, next);
    return this.strip(next);
  }
}
