import type { Verdict } from '../../components/VerdictTag';
import type { LessonStatus } from '../../types/api';

/** Lesson and course progress use the verdict language (docs/design.md). */
export function verdictFor(status: LessonStatus): Verdict {
  switch (status) {
    case 'completed':
      return 'pass';
    case 'in_progress':
      return 'inProgress';
    default:
      return 'notRun';
  }
}

/**
 * How much of the article has been read, 0–100: the share of it that is
 * above the bottom of the viewport.
 */
export function readingPercent(
  articleTop: number,
  articleHeight: number,
  viewportHeight: number,
): number {
  if (articleHeight <= 0) return 0;
  const read = (viewportHeight - articleTop) / articleHeight;
  return Math.round(Math.min(1, Math.max(0, read)) * 100);
}

/** Report in 10-point steps so scrolling does not send a request per frame. */
export const REPORT_STEP = 10;

/**
 * The percentage to send, or null when there is nothing new worth sending.
 * Progress only moves forward, so lower values are never sent.
 */
export function progressToReport(
  lastReported: number,
  current: number,
): number | null {
  const stepped =
    current >= 100 ? 100 : Math.floor(current / REPORT_STEP) * REPORT_STEP;
  return stepped > lastReported ? stepped : null;
}

/** "1.2": module number and lesson number within the module. */
export function lessonNumber(moduleIndex: number, lessonIndex: number): string {
  return `${moduleIndex + 1}.${lessonIndex + 1}`;
}
