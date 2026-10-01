import type { LessonStatus } from '../learning/lesson-progress.repository.js';
import type { ExerciseType } from '../practice/exercise-schema.js';
import { type Feedback, PASS_SCORE } from '../practice/grading.js';

// Pure rules of the dashboard and progress pages: no Nest, no Supabase.

/** Row of `public.v_user_skill_progress` (one per skill). */
export interface SkillProgressRow {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  skill_order: number;
  total_lessons: number;
  completed_lessons: number;
  started_lessons: number;
  total_exercises: number;
  attempted_exercises: number;
  passed_exercises: number;
  average_score: number | null;
}

/** Row of `public.v_user_exercise_results` (one per attempted exercise). */
export interface ExerciseResultRow {
  exercise_id: string;
  attempt_count: number;
  best_score: number;
  last_score: number;
  last_attempted_at: string;
  passed: boolean;
  best_feedback: Feedback;
}

/** Where a visible exercise sits, for weak areas. */
export interface ExercisePlacement {
  id: string;
  type: ExerciseType;
  skillId: string;
  /** Position in catalogue order (skill, course, module, lesson, exercise). */
  position: number;
}

export function percentOf(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/** Same rule as a course: completed when every lesson is, else started. */
export function skillStatus(row: SkillProgressRow): LessonStatus {
  if (row.total_lessons > 0 && row.completed_lessons === row.total_lessons) {
    return 'completed';
  }
  return row.started_lessons > 0 ? 'in_progress' : 'not_started';
}

/** Rounded mean, or null for no values (same rounding as SQL `round`). */
export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

// Streak ---------------------------------------------------------------------

/** The calendar date (`YYYY-MM-DD`) of an instant in a time zone. */
export function localDate(instant: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export interface Streak {
  /** Consecutive days with activity up to today, or up to yesterday. */
  current: number;
  longest: number;
  activeToday: boolean;
  /** The last `window` days, oldest first, ending today. */
  days: { date: string; active: boolean }[];
}

export const STREAK_WINDOW = 14;

/**
 * Streak from the days with activity (any order, duplicates allowed). A
 * streak is still current when today has no activity yet but yesterday had:
 * it breaks only once a whole day passes without study.
 */
export function streakOf(
  activeDays: string[],
  today: string,
  window = STREAK_WINDOW,
): Streak {
  const active = new Set(activeDays);
  const activeToday = active.has(today);

  let current = 0;
  let day = activeToday ? today : addDays(today, -1);
  while (active.has(day)) {
    current += 1;
    day = addDays(day, -1);
  }

  let longest = 0;
  for (const start of active) {
    // Count only from the first day of a run.
    if (active.has(addDays(start, -1))) continue;
    let length = 0;
    for (let next = start; active.has(next); next = addDays(next, 1)) {
      length += 1;
    }
    longest = Math.max(longest, length);
  }

  const days = Array.from({ length: window }, (_, index) => {
    const date = addDays(today, index - window + 1);
    return { date, active: active.has(date) };
  });
  return { current, longest, activeToday, days };
}

// Weak areas -----------------------------------------------------------------

export interface WeakSkill {
  row: SkillProgressRow;
  /** The attempted, not passed exercise with the lowest best score. */
  retry: { exercise: ExercisePlacement; bestScore: number } | null;
}

export const WEAK_SKILL_LIMIT = 3;
export const WEAK_CONCEPT_LIMIT = 5;

/**
 * Skills whose average best score is below the pass mark, lowest first
 * (ties in skill order). Skills without attempts are not weak: they are
 * simply not studied yet.
 */
export function weakSkills(
  rows: SkillProgressRow[],
  results: ExerciseResultRow[],
  placements: ReadonlyMap<string, ExercisePlacement>,
  limit = WEAK_SKILL_LIMIT,
): WeakSkill[] {
  return rows
    .filter(
      (row) =>
        row.attempted_exercises > 0 &&
        row.average_score !== null &&
        row.average_score < PASS_SCORE,
    )
    .sort(
      (a, b) =>
        a.average_score! - b.average_score! || a.skill_order - b.skill_order,
    )
    .slice(0, limit)
    .map((row) => {
      const candidates = results
        .filter((result) => !result.passed)
        .map((result) => ({
          result,
          exercise: placements.get(result.exercise_id),
        }))
        .filter(
          (entry): entry is typeof entry & { exercise: ExercisePlacement } =>
            entry.exercise?.skillId === row.skill_id,
        )
        .sort(
          (a, b) =>
            a.result.best_score - b.result.best_score ||
            a.exercise.position - b.exercise.position,
        );
      const worst = candidates[0];
      return {
        row,
        retry: worst
          ? { exercise: worst.exercise, bestScore: worst.result.best_score }
          : null,
      };
    });
}

export interface WeakConcept {
  concept: string;
  /** Best answers that missed it. */
  missed: number;
  /** Best answers that were checked for it. */
  checked: number;
}

/**
 * Concepts (free-text checks) missed in the best answers, most often missed
 * first (by share, then count, then name). Concepts with the same name in
 * several exercises count together (case-insensitive).
 */
export function weakConcepts(
  results: ExerciseResultRow[],
  limit = WEAK_CONCEPT_LIMIT,
): WeakConcept[] {
  const byKey = new Map<string, WeakConcept>();
  for (const result of results) {
    const feedback = result.best_feedback;
    if (!('concepts' in feedback)) continue;
    for (const { concept, matched } of feedback.concepts) {
      const key = concept.trim().toLowerCase();
      const entry = byKey.get(key) ?? { concept, missed: 0, checked: 0 };
      entry.checked += 1;
      if (!matched) entry.missed += 1;
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .filter((entry) => entry.missed > 0)
    .sort(
      (a, b) =>
        b.missed / b.checked - a.missed / a.checked ||
        b.missed - a.missed ||
        a.concept.localeCompare(b.concept),
    )
    .slice(0, limit);
}
