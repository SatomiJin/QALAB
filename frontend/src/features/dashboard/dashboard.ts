import type { Verdict } from '../../components/VerdictTag';
import { type Activity, TIME_ZONE_MAX_LENGTH } from '../../types/api';

/** The browser's IANA time zone for the streak days; UTC when unknown. */
export function browserTimeZone(
  resolve: () => string | undefined = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    const zone = resolve();
    return zone && zone.length <= TIME_ZONE_MAX_LENGTH ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Activity rows use the verdict language: a started lesson is in progress. */
export function activityVerdict(activity: Activity): Verdict {
  switch (activity.kind) {
    case 'lesson_completed':
      return 'pass';
    case 'lesson_started':
      return 'inProgress';
    default:
      return activity.isCorrect ? 'pass' : 'fail';
  }
}

/** Where an activity row links: the exercise for attempts, else the lesson. */
export function activityPath(activity: Activity): string {
  return activity.exercise
    ? `/practice/exercises/${activity.exercise.id}`
    : `/learning/lessons/${activity.lesson.id}`;
}

/** Local `YYYY-MM-DD` (from the API) as a Date at local noon, for display. */
export function dayToDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}
