import type {
  ActivityKind,
  ActivityRow,
} from '../../src/dashboard/dashboard.repository.js';
import {
  averageOf,
  type ExerciseResultRow,
  localDate,
  type SkillProgressRow,
} from '../../src/dashboard/stats.js';
import type {
  FakeContentRepository,
  FakeLessonProgressRepository,
} from './fake-learning.js';
import {
  type FakeAttemptsRepository,
  type FakeExercisesRepository,
  userIdFromToken,
} from './fake-practice.js';

type Event = Omit<ActivityRow, 'kind'> & {
  kind: ActivityKind | 'lesson_visited';
  visible: boolean;
};

/**
 * In-memory `DashboardRepository`: computes the dashboard views
 * (`v_user_skill_progress`, `v_user_exercise_results`, `v_user_activity`,
 * `activity_days`) from the other fakes' stores, with the same rules: own
 * rows only, published content only, the best attempt counts.
 */
export class FakeDashboardRepository {
  constructor(
    private readonly content: FakeContentRepository,
    private readonly exercises: FakeExercisesRepository,
    private readonly progress: FakeLessonProgressRepository,
    private readonly attempts: FakeAttemptsRepository,
  ) {}

  private skillOfLesson(lessonId: string): string | undefined {
    const lesson = this.content.lessons.get(lessonId);
    const module = lesson && this.content.modules.get(lesson.row.module_id);
    return (
      module && this.content.courses.get(module.row.course_id)?.row.skill_id
    );
  }

  private results(userId: string): ExerciseResultRow[] {
    const byExercise = new Map<string, typeof this.attempts.rows>();
    for (const row of this.attempts.rows) {
      if (row.user_id !== userId) continue;
      byExercise.set(row.exercise_id, [
        ...(byExercise.get(row.exercise_id) ?? []),
        row,
      ]);
    }
    return [...byExercise.entries()].map(([exercise_id, rows]) => {
      const newest = [...rows].sort((a, b) =>
        b.attempted_at.localeCompare(a.attempted_at),
      );
      const best = [...newest].sort((a, b) => b.score - a.score)[0];
      return {
        exercise_id,
        attempt_count: rows.length,
        best_score: best.score,
        last_score: newest[0].score,
        last_attempted_at: newest[0].attempted_at,
        passed: rows.some((row) => row.is_correct),
        best_feedback: structuredClone(best.feedback),
      };
    });
  }

  async listSkillProgress(
    _token: string,
    userId: string,
  ): Promise<SkillProgressRow[]> {
    const lessons = [...this.content.lessons.keys()].filter((id) =>
      this.content.isLessonVisible(id),
    );
    const exercises = [...this.exercises.rows.values()]
      .map((entry) => entry.row)
      .filter((row) => this.exercises.isVisible(row.id));
    const progress = [...this.progress.rows.values()].filter(
      (row) => row.user_id === userId,
    );
    const results = this.results(userId);

    const skills = await this.content.listSkills('');
    return skills.map((skill) => {
      const own = lessons.filter((id) => this.skillOfLesson(id) === skill.id);
      const rows = progress.filter((row) => own.includes(row.lesson_id));
      const ownExercises = exercises
        .filter((row) => this.skillOfLesson(row.lesson_id) === skill.id)
        .map((row) => row.id);
      const attempted = results.filter((result) =>
        ownExercises.includes(result.exercise_id),
      );
      return {
        skill_id: skill.id,
        skill_code: skill.code,
        skill_name: skill.name,
        skill_order: skill.order_index,
        total_lessons: own.length,
        completed_lessons: rows.filter((row) => row.status === 'completed')
          .length,
        started_lessons: rows.filter((row) => row.status !== 'not_started')
          .length,
        total_exercises: ownExercises.length,
        attempted_exercises: attempted.length,
        passed_exercises: attempted.filter((result) => result.passed).length,
        average_score: averageOf(attempted.map((result) => result.best_score)),
      };
    });
  }

  async listExerciseResults(
    _token: string,
    userId: string,
  ): Promise<ExerciseResultRow[]> {
    return this.results(userId);
  }

  private events(userId: string): Event[] {
    const events: Event[] = [];
    const base = {
      exercise_id: null,
      attempt_id: null,
      score: null,
      is_correct: null,
    };
    for (const row of this.progress.rows.values()) {
      if (row.user_id !== userId) continue;
      const visible = this.content.isLessonVisible(row.lesson_id);
      const lesson = { ...base, lesson_id: row.lesson_id, visible };
      if (row.started_at) {
        events.push({
          ...lesson,
          kind: 'lesson_started',
          occurred_at: row.started_at,
        });
      }
      if (row.completed_at) {
        events.push({
          ...lesson,
          kind: 'lesson_completed',
          occurred_at: row.completed_at,
        });
      }
      events.push({
        ...lesson,
        kind: 'lesson_visited',
        occurred_at: row.last_accessed_at,
      });
    }
    for (const row of this.attempts.rows) {
      if (row.user_id !== userId) continue;
      const exercise = this.exercises.rows.get(row.exercise_id);
      events.push({
        kind: 'exercise_attempted',
        occurred_at: row.attempted_at,
        lesson_id: exercise?.row.lesson_id ?? null,
        exercise_id: row.exercise_id,
        attempt_id: row.id,
        score: row.score,
        is_correct: row.is_correct,
        visible: this.exercises.isVisible(row.exercise_id),
      });
    }
    return events;
  }

  async listRecentActivity(
    _token: string,
    userId: string,
    limit: number,
  ): Promise<ActivityRow[]> {
    return this.events(userId)
      .filter((event) => event.visible && event.kind !== 'lesson_visited')
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limit)
      .map(({ visible: _visible, ...row }) => row as ActivityRow);
  }

  async listActivityDays(token: string, timeZone: string): Promise<string[]> {
    const days = this.events(userIdFromToken(token)).map((event) =>
      localDate(new Date(event.occurred_at), timeZone),
    );
    return [...new Set(days)].sort().reverse();
  }
}
