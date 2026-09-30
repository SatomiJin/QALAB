import { randomUUID } from 'node:crypto';
import type {
  AttemptRow,
  AttemptScoreRow,
  AttemptWrite,
} from '../../src/practice/attempts.repository.js';
import type { ExerciseAnswerRow } from '../../src/practice/exercise-answers.repository.js';
import type {
  Difficulty,
  ExerciseType,
  SelfAssessment,
} from '../../src/practice/exercise-schema.js';
import type {
  ExerciseFilter,
  ExerciseRow,
} from '../../src/practice/exercises.repository.js';
import type { FakeContentRepository } from './fake-learning.js';

type Status = 'draft' | 'published' | 'archived';

/** The user id (`sub`) of a fake-auth access token. */
export function userIdFromToken(token: string): string {
  const payload = token.split('.')[1] ?? '';
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    sub: string;
  };
  return claims.sub;
}

/**
 * In-memory `ExercisesRepository`. Like RLS plus the status filter: only
 * published exercises whose lesson, module and course are published.
 */
export class FakeExercisesRepository {
  readonly rows = new Map<string, { row: ExerciseRow; status: Status }>();

  constructor(private readonly content: FakeContentRepository) {}

  add(
    lessonId: string,
    type: ExerciseType,
    prompt_data: unknown,
    {
      status = 'published' as Status,
      order_index = 1,
      difficulty = 'easy' as Difficulty,
      question = `Question ${type}`,
    } = {},
  ): ExerciseRow {
    const row = {
      id: randomUUID(),
      lesson_id: lessonId,
      type,
      question,
      prompt_data,
      difficulty,
      order_index,
    };
    this.rows.set(row.id, { row, status });
    return row;
  }

  setStatus(id: string, status: Status): void {
    const entry = this.rows.get(id);
    if (!entry) throw new Error(`No exercise ${id}`);
    entry.status = status;
  }

  isVisible(id: string): boolean {
    const entry = this.rows.get(id);
    return (
      entry?.status === 'published' &&
      this.content.isLessonVisible(entry.row.lesson_id)
    );
  }

  async listForLessons(
    _token: string,
    lessonIds: string[],
    filter: ExerciseFilter = {},
  ): Promise<ExerciseRow[]> {
    return [...this.rows.values()]
      .map((entry) => entry.row)
      .filter((row) => this.isVisible(row.id))
      .filter((row) => lessonIds.includes(row.lesson_id))
      .filter((row) => !filter.types || filter.types.includes(row.type))
      .filter(
        (row) => !filter.difficulty || row.difficulty === filter.difficulty,
      )
      .sort(
        (a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id),
      );
  }

  async find(_token: string, id: string): Promise<ExerciseRow | null> {
    return this.isVisible(id) ? this.rows.get(id)!.row : null;
  }
}

/** In-memory `ExerciseAnswersRepository` (service role: sees every key). */
export class FakeExerciseAnswersRepository {
  readonly rows = new Map<string, ExerciseAnswerRow>();
  /** Every exercise id whose key was read, to prove reads stay server-side. */
  readonly reads: string[] = [];

  set(
    exerciseId: string,
    answer_data: unknown,
    explanation = 'Because.',
  ): void {
    this.rows.set(exerciseId, { answer_data, explanation });
  }

  async find(exerciseId: string): Promise<ExerciseAnswerRow | null> {
    this.reads.push(exerciseId);
    return this.rows.get(exerciseId) ?? null;
  }
}

/**
 * In-memory `AttemptsRepository`. Reads are per user (RLS); the
 * self-assessment is written once (the `exercise_attempts_immutable`
 * trigger).
 */
export class FakeAttemptsRepository {
  readonly rows: (AttemptRow & { user_id: string })[] = [];
  private clock = Date.parse('2026-09-30T08:00:00Z');

  hasAttempted(userId: string, exerciseId: string): boolean {
    return this.rows.some(
      (row) => row.user_id === userId && row.exercise_id === exerciseId,
    );
  }

  async insert(row: AttemptWrite): Promise<AttemptRow> {
    // Strictly increasing times, so "newest first" is deterministic.
    this.clock += 1000;
    const stored = {
      ...row,
      id: randomUUID(),
      self_assessment: null,
      attempted_at: new Date(this.clock).toISOString(),
    };
    this.rows.push(stored);
    return this.strip(stored);
  }

  private strip({ user_id: _user, ...row }: AttemptRow & { user_id: string }) {
    return structuredClone(row) as AttemptRow;
  }

  private own(userId: string) {
    return this.rows
      .filter((row) => row.user_id === userId)
      .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at));
  }

  async listForExercise(
    _token: string,
    userId: string,
    exerciseId: string,
    { offset, limit }: { offset: number; limit: number },
  ): Promise<{ rows: AttemptRow[]; total: number }> {
    const rows = this.own(userId).filter(
      (row) => row.exercise_id === exerciseId,
    );
    return {
      rows: rows.slice(offset, offset + limit).map((row) => this.strip(row)),
      total: rows.length,
    };
  }

  async listScores(
    _token: string,
    userId: string,
    exerciseIds: string[],
  ): Promise<AttemptScoreRow[]> {
    return this.own(userId)
      .filter((row) => exerciseIds.includes(row.exercise_id))
      .map(({ exercise_id, score, is_correct, attempted_at }) => ({
        exercise_id,
        score,
        is_correct,
        attempted_at,
      }));
  }

  async find(
    _token: string,
    userId: string,
    attemptId: string,
  ): Promise<AttemptRow | null> {
    const row = this.own(userId).find((entry) => entry.id === attemptId);
    return row ? this.strip(row) : null;
  }

  async saveSelfAssessment(
    _token: string,
    userId: string,
    attemptId: string,
    selfAssessment: SelfAssessment,
  ): Promise<AttemptRow | null> {
    const row = this.own(userId).find((entry) => entry.id === attemptId);
    if (!row || row.self_assessment !== null) return null;
    row.self_assessment = selfAssessment;
    return this.strip(row);
  }
}
