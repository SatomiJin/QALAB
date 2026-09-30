import type {
  CourseRow,
  LessonSummaryRow,
  ModuleRow,
  SkillRow,
} from './content.repository.js';
import type {
  LessonProgressRow,
  LessonStatus,
} from './lesson-progress.repository.js';

/** A published course with its published modules and lessons, in order. */
export interface CourseOutline {
  course: CourseRow;
  skill: SkillRow | undefined;
  modules: { module: ModuleRow; lessons: LessonSummaryRow[] }[];
  /** All lessons in reading order (module order, then lesson order). */
  lessons: LessonSummaryRow[];
}

export type ProgressByLesson = ReadonlyMap<string, LessonProgressRow>;

export interface CourseProgressSummary {
  totalLessons: number;
  completedLessons: number;
  status: LessonStatus;
}

/**
 * Groups flat rows into outlines. Rows must already be ordered (repositories
 * sort by `order_index`); lessons whose module is not in the list (not
 * published) are dropped, so parents are always published too.
 */
export function buildOutlines(
  courses: CourseRow[],
  modules: ModuleRow[],
  lessons: LessonSummaryRow[],
  skills: SkillRow[],
): CourseOutline[] {
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const lessonsByModule = new Map<string, LessonSummaryRow[]>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }

  return courses.map((course) => {
    const courseModules = modules
      .filter((module) => module.course_id === course.id)
      .map((module) => ({
        module,
        lessons: lessonsByModule.get(module.id) ?? [],
      }));
    return {
      course,
      skill: skillById.get(course.skill_id),
      modules: courseModules,
      lessons: courseModules.flatMap((entry) => entry.lessons),
    };
  });
}

function compareCatalogue(
  a: { course: CourseRow; skill: SkillRow | undefined },
  b: { course: CourseRow; skill: SkillRow | undefined },
): number {
  return (
    (a.skill?.order_index ?? 0) - (b.skill?.order_index ?? 0) ||
    a.course.order_index - b.course.order_index ||
    a.course.title.localeCompare(b.course.title) ||
    a.course.id.localeCompare(b.course.id)
  );
}

/** Courses in catalogue order: by skill order, then course order. */
export function sortByCatalogueOrder(
  outlines: CourseOutline[],
): CourseOutline[] {
  return [...outlines].sort(compareCatalogue);
}

/** Same order for bare course rows (used to paginate before loading). */
export function sortCoursesByCatalogue(
  courses: CourseRow[],
  skills: SkillRow[],
): CourseRow[] {
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  return courses
    .map((course) => ({ course, skill: skillById.get(course.skill_id) }))
    .sort(compareCatalogue)
    .map((entry) => entry.course);
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

/** The slice for a 1-based page. Past the end gives an empty slice. */
export function pageOf<T>(items: T[], { page, pageSize }: PageRequest): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function lessonStatus(
  progress: ProgressByLesson,
  lessonId: string,
): LessonStatus {
  return progress.get(lessonId)?.status ?? 'not_started';
}

export function summarizeProgress(
  outline: CourseOutline,
  progress: ProgressByLesson,
): CourseProgressSummary {
  const totalLessons = outline.lessons.length;
  let completedLessons = 0;
  let started = false;
  for (const lesson of outline.lessons) {
    const status = lessonStatus(progress, lesson.id);
    if (status === 'completed') completedLessons += 1;
    if (status !== 'not_started') started = true;
  }

  let status: LessonStatus = 'not_started';
  if (totalLessons > 0 && completedLessons === totalLessons) {
    status = 'completed';
  } else if (started) {
    status = 'in_progress';
  }
  return { totalLessons, completedLessons, status };
}

/** First lesson in reading order that is not completed. */
export function nextLesson(
  outline: CourseOutline,
  progress: ProgressByLesson,
): LessonSummaryRow | null {
  return (
    outline.lessons.find(
      (lesson) => lessonStatus(progress, lesson.id) !== 'completed',
    ) ?? null
  );
}

export function neighbours(
  outline: CourseOutline,
  lessonId: string,
): { previous: LessonSummaryRow | null; next: LessonSummaryRow | null } {
  const index = outline.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: outline.lessons[index - 1] ?? null,
    next: outline.lessons[index + 1] ?? null,
  };
}

export interface ProgressInput {
  progressPercent?: number;
  complete?: boolean;
}

/**
 * The row to write when a learner opens, reads or completes a lesson.
 * Progress only moves forward: the percentage never drops, a completed lesson
 * stays completed, `startedAt` is set once. The database trigger enforces the
 * same rules, so concurrent writes cannot undo each other.
 */
export function nextProgress(
  existing: LessonProgressRow | null,
  input: ProgressInput,
  lessonId: string,
  now: string,
): LessonProgressRow {
  const completed = input.complete === true || existing?.status === 'completed';
  return {
    lesson_id: lessonId,
    status: completed ? 'completed' : 'in_progress',
    progress_percent: completed
      ? 100
      : Math.max(existing?.progress_percent ?? 0, input.progressPercent ?? 0),
    started_at: existing?.started_at ?? now,
    completed_at: completed ? (existing?.completed_at ?? now) : null,
    last_accessed_at: now,
  };
}

export type ContinueReason = 'start' | 'resume' | 'next';

export interface ContinueChoice {
  reason: ContinueReason;
  outline: CourseOutline;
  lesson: LessonSummaryRow;
}

/**
 * The lesson to offer on "Continue learning":
 *
 * 1. The most recently opened lesson, if it is not completed (`resume`).
 * 2. Otherwise the next unfinished lesson of that course (`next`).
 * 3. Otherwise the most recent unfinished lesson anywhere (`resume`).
 * 4. Otherwise the first unfinished lesson in catalogue order (`start` when
 *    the learner has no progress at all, `next` otherwise).
 * 5. `null` when everything published is completed (or nothing is).
 *
 * `outlines` must be in catalogue order; `recent` most recent first.
 */
export function chooseContinue(
  outlines: CourseOutline[],
  recent: LessonProgressRow[],
): ContinueChoice | null {
  const progress: ProgressByLesson = new Map(
    recent.map((row) => [row.lesson_id, row]),
  );
  const outlineByLesson = new Map<
    string,
    { outline: CourseOutline; lesson: LessonSummaryRow }
  >();
  for (const outline of outlines) {
    for (const lesson of outline.lessons) {
      outlineByLesson.set(lesson.id, { outline, lesson });
    }
  }

  // Only progress on lessons that are still published counts.
  const visible = recent.filter((row) => outlineByLesson.has(row.lesson_id));
  const latest = visible[0];

  // A suggested lesson that was already opened is resumed, not started.
  const pick = (
    outline: CourseOutline,
    lesson: LessonSummaryRow,
    fresh: ContinueReason,
  ): ContinueChoice => ({
    reason:
      lessonStatus(progress, lesson.id) === 'in_progress' ? 'resume' : fresh,
    outline,
    lesson,
  });

  if (latest) {
    const entry = outlineByLesson.get(latest.lesson_id)!;
    if (latest.status !== 'completed') {
      return { reason: 'resume', ...entry };
    }
    const next = nextLesson(entry.outline, progress);
    if (next) return pick(entry.outline, next, 'next');

    const unfinished = visible.find((row) => row.status !== 'completed');
    if (unfinished) {
      return {
        reason: 'resume',
        ...outlineByLesson.get(unfinished.lesson_id)!,
      };
    }
  }

  for (const outline of outlines) {
    const lesson = nextLesson(outline, progress);
    if (lesson) return pick(outline, lesson, latest ? 'next' : 'start');
  }
  return null;
}
