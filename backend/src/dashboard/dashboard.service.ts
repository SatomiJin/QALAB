import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import type { LessonSummaryRow } from '../learning/content.repository.js';
import { LearningService } from '../learning/learning.service.js';
import { LessonProgressRepository } from '../learning/lesson-progress.repository.js';
import {
  continueRefs,
  courseRef,
  courseText,
  lessonTitle,
  toContinueItem,
} from '../learning/mapping.js';
import { chooseContinue, type CourseOutline } from '../learning/outline.js';
import {
  type ExerciseRow,
  ExercisesRepository,
} from '../practice/exercises.repository.js';
import {
  type ContentLanguage,
  ContentTranslationService,
  type TextRef,
} from '../translation/content-translation.service.js';
import {
  type ActivityRow,
  DashboardRepository,
} from './dashboard.repository.js';
import {
  ActivityDto,
  DashboardDto,
  ExerciseTotalsDto,
  SkillProgressDto,
} from './dto/dashboard.dto.js';
import {
  averageOf,
  type ExercisePlacement,
  type ExerciseResultRow,
  localDate,
  percentOf,
  type SkillProgressRow,
  skillStatus,
  streakOf,
  weakConcepts,
  weakSkills,
} from './stats.js';

export const RECENT_ACTIVITY_LIMIT = 10;

interface LessonPlace {
  lesson: LessonSummaryRow;
  outline: CourseOutline;
}

function exerciseTotals(row: SkillProgressRow): ExerciseTotalsDto {
  return {
    total: row.total_exercises,
    attempted: row.attempted_exercises,
    passed: row.passed_exercises,
    averageScore: row.average_score,
  };
}

function toSkillProgress(row: SkillProgressRow): SkillProgressDto {
  return {
    code: row.skill_code,
    name: row.skill_name,
    totalLessons: row.total_lessons,
    completedLessons: row.completed_lessons,
    percent: percentOf(row.completed_lessons, row.total_lessons),
    status: skillStatus(row),
    exercises: exerciseTotals(row),
  };
}

/**
 * Exercises in catalogue order (lesson order, then the exercise's own), with
 * their skill. Rows come from the repository sorted by `order_index` only.
 */
function placeExercises(
  outlines: CourseOutline[],
  exercises: ExerciseRow[],
): Map<string, ExercisePlacement> {
  const lessonIndex = new Map<string, { index: number; skillId: string }>();
  for (const outline of outlines) {
    for (const lesson of outline.lessons) {
      lessonIndex.set(lesson.id, {
        index: lessonIndex.size,
        skillId: outline.course.skill_id,
      });
    }
  }
  const ordered = exercises
    .filter((row) => lessonIndex.has(row.lesson_id))
    .sort(
      (a, b) =>
        lessonIndex.get(a.lesson_id)!.index -
          lessonIndex.get(b.lesson_id)!.index ||
        a.order_index - b.order_index ||
        a.id.localeCompare(b.id),
    );
  return new Map(
    ordered.map((row, position) => [
      row.id,
      {
        id: row.id,
        type: row.type,
        skillId: lessonIndex.get(row.lesson_id)!.skillId,
        position,
      },
    ]),
  );
}

/**
 * The learner's dashboard. Every number is derived on read from the views
 * over lesson_progress and exercise_attempts; nothing is stored.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly learning: LearningService,
    private readonly progress: LessonProgressRepository,
    private readonly exercises: ExercisesRepository,
    private readonly dashboard: DashboardRepository,
    private readonly translations: ContentTranslationService,
  ) {}

  async getDashboard(
    user: AuthUser,
    { lang, tz }: { lang: ContentLanguage; tz: string },
  ): Promise<DashboardDto> {
    const token = user.accessToken;
    const [outlines, recent, skillRows, results, activity, days] =
      await Promise.all([
        this.learning.loadCatalogue(user),
        this.progress.listForUser(token, user.id),
        this.dashboard.listSkillProgress(token, user.id),
        this.dashboard.listExerciseResults(token, user.id),
        this.dashboard.listRecentActivity(
          token,
          user.id,
          RECENT_ACTIVITY_LIMIT,
        ),
        this.dashboard.listActivityDays(token, tz),
      ]);
    const exercises = await this.exercises.listForLessons(
      token,
      outlines.flatMap((outline) => outline.lessons.map((lesson) => lesson.id)),
    );

    const placements = placeExercises(outlines, exercises);
    // Results on exercises that are no longer published do not count.
    const visibleResults = results.filter((result) =>
      placements.has(result.exercise_id),
    );
    const lessons = new Map<string, LessonPlace>();
    for (const outline of outlines) {
      for (const lesson of outline.lessons) {
        lessons.set(lesson.id, { lesson, outline });
      }
    }
    const events = activity.filter(
      (row) =>
        row.lesson_id !== null &&
        lessons.has(row.lesson_id) &&
        (row.exercise_id === null || placements.has(row.exercise_id)),
    );

    const choice = chooseContinue(outlines, recent);
    const refs: TextRef[] = [
      ...(choice ? continueRefs(choice) : []),
      ...events.flatMap((row) => {
        const { lesson, outline } = lessons.get(row.lesson_id!)!;
        return [lessonTitle(lesson), courseText(outline.course, 'title')];
      }),
    ];
    const tr =
      refs.length > 0
        ? await this.translations.translate(user, refs, lang)
        : null;

    const toActivity = (row: ActivityRow): ActivityDto => {
      const { lesson, outline } = lessons.get(row.lesson_id!)!;
      const exercise = row.exercise_id
        ? placements.get(row.exercise_id)!
        : null;
      return {
        kind: row.kind,
        occurredAt: row.occurred_at,
        lesson: { id: lesson.id, title: tr!.get(lessonTitle(lesson)) },
        course: courseRef(outline.course, tr!),
        exercise: exercise ? { id: exercise.id, type: exercise.type } : null,
        score: row.score,
        isCorrect: row.is_correct,
      };
    };

    return {
      overall: this.overall(skillRows, visibleResults),
      streak: streakOf(days, localDate(new Date(), tz)),
      continue: choice ? toContinueItem(choice, recent, tr!) : null,
      skills: skillRows.map(toSkillProgress),
      weakAreas: {
        skills: weakSkills(skillRows, visibleResults, placements).map(
          ({ row, retry }) => ({
            code: row.skill_code,
            name: row.skill_name,
            averageScore: row.average_score!,
            attemptedExercises: row.attempted_exercises,
            passedExercises: row.passed_exercises,
            retry: retry
              ? {
                  id: retry.exercise.id,
                  type: retry.exercise.type,
                  bestScore: retry.bestScore,
                }
              : null,
          }),
        ),
        concepts: weakConcepts(visibleResults),
      },
      recentActivity: events.map(toActivity),
      timeZone: tz,
      language: lang,
      translation: tr?.status ?? 'none',
    };
  }

  /** Totals over every skill (a lesson or exercise belongs to one skill). */
  private overall(
    rows: SkillProgressRow[],
    results: ExerciseResultRow[],
  ): DashboardDto['overall'] {
    const sum = (pick: (row: SkillProgressRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    const totalLessons = sum((row) => row.total_lessons);
    const completedLessons = sum((row) => row.completed_lessons);
    return {
      totalLessons,
      completedLessons,
      percent: percentOf(completedLessons, totalLessons),
      exercises: {
        total: sum((row) => row.total_exercises),
        attempted: sum((row) => row.attempted_exercises),
        passed: sum((row) => row.passed_exercises),
        averageScore: averageOf(results.map((result) => result.best_score)),
      },
    };
  }
}
