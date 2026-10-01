import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { LearningService } from '../learning/learning.service.js';
import { LessonProgressRepository } from '../learning/lesson-progress.repository.js';
import {
  lessonTitle,
  moduleText,
  outlineRefs,
  toCourseSummary,
  toProgressDto,
} from '../learning/mapping.js';
import type { ExerciseStatsDto } from '../practice/dto/practice.dto.js';
import {
  type ExerciseRow,
  ExercisesRepository,
} from '../practice/exercises.repository.js';
import {
  ContentTranslationService,
  type TextRef,
} from '../translation/content-translation.service.js';
import { DashboardRepository } from './dashboard.repository.js';
import {
  ExerciseTotalsDto,
  ProgressPageDto,
  ProgressQueryDto,
} from './dto/dashboard.dto.js';
import { averageOf, type ExerciseResultRow } from './stats.js';

const questionRef = (exercise: ExerciseRow): TextRef => ({
  type: 'exercise',
  id: exercise.id,
  field: 'question',
  text: exercise.question,
});

function toStats(result: ExerciseResultRow | undefined): ExerciseStatsDto {
  return {
    attemptCount: result?.attempt_count ?? 0,
    bestScore: result?.best_score ?? null,
    lastScore: result?.last_score ?? null,
    lastAttemptedAt: result?.last_attempted_at ?? null,
    passed: result?.passed ?? false,
  };
}

function totalsOf(
  exercises: ExerciseRow[],
  results: ReadonlyMap<string, ExerciseResultRow>,
): ExerciseTotalsDto {
  const attempted = exercises
    .map((exercise) => results.get(exercise.id))
    .filter((result) => result !== undefined);
  return {
    total: exercises.length,
    attempted: attempted.length,
    passed: attempted.filter((result) => result.passed).length,
    averageScore: averageOf(attempted.map((result) => result.best_score)),
  };
}

/**
 * The Progress page: every published course (one page, catalogue order) with
 * its lessons and their exercises, and the learner's results on each.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly learning: LearningService,
    private readonly progress: LessonProgressRepository,
    private readonly exercises: ExercisesRepository,
    private readonly dashboard: DashboardRepository,
    private readonly translations: ContentTranslationService,
  ) {}

  async getProgress(
    user: AuthUser,
    query: ProgressQueryDto,
  ): Promise<ProgressPageDto> {
    const { page, pageSize, lang } = query;
    const token = user.accessToken;
    const { outlines, total } = await this.learning.loadCoursePage(user, query);
    const lessonIds = outlines.flatMap((outline) =>
      outline.lessons.map((lesson) => lesson.id),
    );
    const [progressRows, exerciseRows, resultRows] = await Promise.all([
      this.progress.listForUser(token, user.id, lessonIds),
      this.exercises.listForLessons(token, lessonIds),
      // Every result of the user (one row per attempted exercise): a list of
      // ids for this page could exceed the URL length.
      this.dashboard.listExerciseResults(token, user.id),
    ]);
    const progress = new Map(progressRows.map((row) => [row.lesson_id, row]));
    const results = new Map(resultRows.map((row) => [row.exercise_id, row]));
    const byLesson = new Map<string, ExerciseRow[]>();
    for (const row of exerciseRows) {
      byLesson.set(row.lesson_id, [
        ...(byLesson.get(row.lesson_id) ?? []),
        row,
      ]);
    }
    const exercisesOf = (lessonId: string) => byLesson.get(lessonId) ?? [];

    const tr = await this.translations.translate(
      user,
      [
        // Module descriptions are not shown: not translated.
        ...outlines.flatMap((outline) => [
          ...outlineRefs(outline, false),
          ...outline.modules.map(({ module }) => moduleText(module, 'title')),
          ...outline.lessons.map(lessonTitle),
        ]),
        ...exerciseRows.map(questionRef),
      ],
      lang,
    );

    return {
      items: outlines.map((outline) => ({
        ...toCourseSummary(outline, progress, tr),
        exercises: totalsOf(
          outline.lessons.flatMap((lesson) => exercisesOf(lesson.id)),
          results,
        ),
        modules: outline.modules.map(({ module, lessons }) => ({
          id: module.id,
          title: tr.get(moduleText(module, 'title')),
          lessons: lessons.map((lesson) => ({
            id: lesson.id,
            title: tr.get(lessonTitle(lesson)),
            estimatedMinutes: lesson.estimated_minutes,
            progress: toProgressDto(progress.get(lesson.id)),
            exercises: exercisesOf(lesson.id).map((exercise) => ({
              id: exercise.id,
              type: exercise.type,
              difficulty: exercise.difficulty,
              question: tr.get(questionRef(exercise)),
              stats: toStats(results.get(exercise.id)),
            })),
          })),
        })),
      })),
      total,
      page,
      pageSize,
      language: lang,
      translation: tr.status,
    };
  }
}
