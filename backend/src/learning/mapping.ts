import type {
  TextRef,
  Translations,
} from '../translation/content-translation.service.js';
import type {
  CourseRow,
  LessonSummaryRow,
  ModuleRow,
} from './content.repository.js';
import type {
  ContinueLessonDto,
  CourseSummaryDto,
  LessonProgressDto,
} from './dto/learning.dto.js';
import type { LessonProgressRow } from './lesson-progress.repository.js';
import {
  type ContinueChoice,
  type CourseOutline,
  type ProgressByLesson,
  summarizeProgress,
} from './outline.js';

// Row → DTO mapping shared by the learning, dashboard and progress services.

export function toProgressDto(
  row: LessonProgressRow | undefined,
): LessonProgressDto {
  return {
    status: row?.status ?? 'not_started',
    progressPercent: row?.progress_percent ?? 0,
    startedAt: row?.started_at ?? null,
    completedAt: row?.completed_at ?? null,
    lastAccessedAt: row?.last_accessed_at ?? null,
  };
}

// Text refs: every content string a response shows, so it can be translated.

export const courseText = (
  course: CourseRow,
  field: 'title' | 'description',
) => ({
  type: 'course' as const,
  id: course.id,
  field,
  text: course[field],
});

export const moduleText = (
  module: ModuleRow,
  field: 'title' | 'description',
) => ({
  type: 'module' as const,
  id: module.id,
  field,
  text: module[field],
});

export const lessonTitle = (lesson: LessonSummaryRow) => ({
  type: 'lesson' as const,
  id: lesson.id,
  field: 'title' as const,
  text: lesson.title,
});

export function outlineRefs(
  outline: CourseOutline,
  withLessons: boolean,
): TextRef[] {
  const refs: TextRef[] = [
    courseText(outline.course, 'title'),
    courseText(outline.course, 'description'),
  ];
  if (withLessons) {
    for (const { module, lessons } of outline.modules) {
      refs.push(moduleText(module, 'title'), moduleText(module, 'description'));
      refs.push(...lessons.map(lessonTitle));
    }
  }
  return refs;
}

export function toCourseSummary(
  outline: CourseOutline,
  progress: ProgressByLesson,
  tr: Translations,
): CourseSummaryDto {
  const { course, skill } = outline;
  return {
    id: course.id,
    slug: course.slug,
    title: tr.get(courseText(course, 'title')),
    description: tr.get(courseText(course, 'description')),
    skill: { code: skill?.code ?? '', name: skill?.name ?? '' },
    orderIndex: course.order_index,
    estimatedMinutes: outline.lessons.reduce(
      (sum, lesson) => sum + lesson.estimated_minutes,
      0,
    ),
    progress: summarizeProgress(outline, progress),
  };
}

export function lessonRef(lesson: LessonSummaryRow | null, tr: Translations) {
  return lesson ? { id: lesson.id, title: tr.get(lessonTitle(lesson)) } : null;
}

export function courseRef(course: CourseRow, tr: Translations) {
  return {
    id: course.id,
    slug: course.slug,
    title: tr.get(courseText(course, 'title')),
  };
}

function moduleOf({ outline, lesson }: ContinueChoice): ModuleRow {
  return outline.modules.find((entry) => entry.module.id === lesson.module_id)!
    .module;
}

/** The texts a continue item shows, to translate with a caller's others. */
export function continueRefs(choice: ContinueChoice): TextRef[] {
  return [
    lessonTitle(choice.lesson),
    courseText(choice.outline.course, 'title'),
    moduleText(moduleOf(choice), 'title'),
  ];
}

export function toContinueItem(
  choice: ContinueChoice,
  recent: LessonProgressRow[],
  tr: Translations,
): ContinueLessonDto {
  const { outline, lesson, reason } = choice;
  const module = moduleOf(choice);
  return {
    reason,
    lessonId: lesson.id,
    lessonTitle: tr.get(lessonTitle(lesson)),
    estimatedMinutes: lesson.estimated_minutes,
    course: courseRef(outline.course, tr),
    module: { id: module.id, title: tr.get(moduleText(module, 'title')) },
    progress: toProgressDto(recent.find((row) => row.lesson_id === lesson.id)),
  };
}
