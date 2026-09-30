import { randomUUID } from 'node:crypto';
import type {
  AdminAnswerRow,
  AdminCourseRow,
  AdminExerciseRow,
  AdminLessonRow,
  AdminLessonSummaryRow,
  AdminModuleRow,
  RowByKind,
  UpdateByKind,
  WriteByKind,
} from '../../src/admin/admin-content.repository.js';
import type {
  ContentKind,
  ContentStatus,
  Usage,
} from '../../src/admin/content-rules.js';
import type {
  FakeContentRepository,
  FakeLessonProgressRepository,
  Stored,
} from './fake-learning.js';
import type {
  FakeAttemptsRepository,
  FakeExerciseAnswersRepository,
  FakeExercisesRepository,
} from './fake-practice.js';

/** A Postgres error as supabase-js returns it (a plain object). */
const pgError = (code: string, message: string) => ({ code, message });

const byOrder = <T extends { order_index: number; id: string }>(a: T, b: T) =>
  a.order_index - b.order_index || a.id.localeCompare(b.id);

type Splittable = { status: ContentStatus } & Record<string, unknown>;

function split<T>(row: Splittable): Stored<T> {
  const { status, created_at: _c, updated_at: _u, ...rest } = row;
  return { row: rest as T, status };
}

/**
 * In-memory `AdminContentRepository` over the same stores as the learner
 * fakes, so what an admin writes is what learners (do not) see. Mirrors the
 * database: unique slugs (23505), `restrict` foreign keys from progress and
 * attempts (23503), cascades, and `reorder_content` (22023).
 */
export class FakeAdminContentRepository {
  private readonly times = new Map<
    string,
    { created_at: string; updated_at: string }
  >();
  private clock = Date.parse('2026-09-30T09:00:00Z');

  constructor(
    private readonly content: FakeContentRepository,
    private readonly exercises: FakeExercisesRepository,
    private readonly answers: FakeExerciseAnswersRepository,
    private readonly progress: FakeLessonProgressRepository,
    private readonly attempts: FakeAttemptsRepository,
  ) {}

  private store(
    kind: ContentKind,
  ): Map<string, Stored<Record<string, unknown>>> {
    const stores = {
      course: this.content.courses,
      module: this.content.modules,
      lesson: this.content.lessons,
      exercise: this.exercises.rows,
    };
    return stores[kind] as unknown as Map<
      string,
      Stored<Record<string, unknown>>
    >;
  }

  private stamp(id: string, created = false): void {
    this.clock += 1000;
    const now = new Date(this.clock).toISOString();
    const old = this.times.get(id);
    this.times.set(id, {
      created_at: created || !old ? now : old.created_at,
      updated_at: now,
    });
  }

  private full<K extends ContentKind>(
    kind: K,
    id: string,
  ): RowByKind[K] | null {
    const entry = this.store(kind).get(id);
    if (!entry) return null;
    const times = this.times.get(id) ?? {
      created_at: '2026-09-30T08:00:00.000Z',
      updated_at: '2026-09-30T08:00:00.000Z',
    };
    return structuredClone({
      ...entry.row,
      status: entry.status,
      ...times,
    }) as unknown as RowByKind[K];
  }

  private all<K extends ContentKind>(kind: K): RowByKind[K][] {
    return [...this.store(kind).keys()]
      .map((id) => this.full(kind, id)!)
      .sort(byOrder);
  }

  private checkSlug(
    kind: ContentKind,
    id: string,
    row: Record<string, unknown>,
  ) {
    if (kind === 'course') {
      if (this.all('course').some((c) => c.id !== id && c.slug === row.slug)) {
        throw pgError(
          '23505',
          'duplicate key value violates unique constraint "courses_slug_key"',
        );
      }
    }
    if (kind === 'lesson') {
      const clash = this.all('lesson').some(
        (l) =>
          l.id !== id && l.module_id === row.module_id && l.slug === row.slug,
      );
      if (clash) {
        throw pgError(
          '23505',
          'duplicate key value violates unique constraint "lessons_module_id_slug_key"',
        );
      }
    }
  }

  async listCourses(
    _token: string,
    filter: { skillId?: string; status?: ContentStatus } = {},
  ): Promise<AdminCourseRow[]> {
    return this.all('course')
      .filter((row) => !filter.skillId || row.skill_id === filter.skillId)
      .filter((row) => !filter.status || row.status === filter.status);
  }

  async listModules(
    _token: string,
    courseIds: string[],
  ): Promise<AdminModuleRow[]> {
    return this.all('module').filter((row) =>
      courseIds.includes(row.course_id),
    );
  }

  async listLessons(
    _token: string,
    moduleIds: string[],
  ): Promise<AdminLessonSummaryRow[]> {
    return this.all('lesson')
      .filter((row) => moduleIds.includes(row.module_id))
      .map(({ content_md: _content, ...summary }) => summary);
  }

  async listExercises(
    _token: string,
    lessonIds: string[],
  ): Promise<AdminExerciseRow[]> {
    return this.all('exercise').filter((row) =>
      lessonIds.includes(row.lesson_id),
    );
  }

  async find<K extends ContentKind>(_token: string, kind: K, id: string) {
    return this.full(kind, id);
  }

  async insert<K extends ContentKind>(
    _token: string,
    kind: K,
    row: WriteByKind[K],
  ): Promise<RowByKind[K]> {
    const id = randomUUID();
    const record = { ...row, id } as unknown as Splittable;
    this.checkSlug(kind, id, record);
    if (kind === 'lesson') {
      const lesson = record as unknown as AdminLessonRow;
      if (lesson.content_md.length > 100_000) {
        throw pgError('23514', 'violates check constraint');
      }
    }
    this.store(kind).set(id, split(record));
    this.stamp(id, true);
    return this.full(kind, id)!;
  }

  async update<K extends ContentKind>(
    _token: string,
    kind: K,
    id: string,
    patch: UpdateByKind[K],
  ): Promise<RowByKind[K] | null> {
    const current = this.full(kind, id);
    if (!current) return null;
    const next = { ...current, ...patch } as unknown as Splittable;
    this.checkSlug(kind, id, next);
    this.store(kind).set(id, split(next));
    this.stamp(id);
    return this.full(kind, id);
  }

  async remove(
    _token: string,
    kind: ContentKind,
    id: string,
  ): Promise<boolean> {
    if (!this.store(kind).has(id)) return false;
    const modules =
      kind === 'course'
        ? this.all('module')
            .filter((m) => m.course_id === id)
            .map((m) => m.id)
        : kind === 'module'
          ? [id]
          : [];
    const lessons =
      kind === 'lesson'
        ? [id]
        : this.all('lesson')
            .filter((l) => modules.includes(l.module_id))
            .map((l) => l.id);
    const exercises =
      kind === 'exercise'
        ? [id]
        : this.all('exercise')
            .filter((e) => lessons.includes(e.lesson_id))
            .map((e) => e.id);
    const usage = await this.usage('', lessons, exercises);
    if (usage.lessons.size || usage.exercises.size) {
      throw pgError(
        '23503',
        'update or delete violates foreign key constraint',
      );
    }
    this.store(kind).delete(id);
    modules.forEach((m) => this.store('module').delete(m));
    lessons.forEach((l) => this.store('lesson').delete(l));
    exercises.forEach((e) => {
      this.store('exercise').delete(e);
      this.answers.rows.delete(e);
    });
    return true;
  }

  async findAnswer(
    _token: string,
    exerciseId: string,
  ): Promise<AdminAnswerRow | null> {
    const row = this.answers.rows.get(exerciseId);
    return row ? structuredClone(row) : null;
  }

  async saveAnswer(
    _token: string,
    exerciseId: string,
    answer: AdminAnswerRow,
  ): Promise<void> {
    this.answers.rows.set(exerciseId, structuredClone(answer));
  }

  async reorder(
    _token: string,
    kind: ContentKind,
    parentId: string,
    ids: string[],
  ): Promise<void> {
    const parentColumn = {
      course: 'skill_id',
      module: 'course_id',
      lesson: 'module_id',
      exercise: 'lesson_id',
    }[kind];
    const store = this.store(kind);
    const children = ids.map((id) => store.get(id));
    if (
      new Set(ids).size !== ids.length ||
      children.some((entry) => !entry || entry.row[parentColumn] !== parentId)
    ) {
      throw pgError('22023', 'every id must be a child of the parent');
    }
    children.forEach((entry, index) => {
      entry!.row = { ...entry!.row, order_index: index + 1 };
    });
  }

  async usage(
    _token: string,
    lessonIds: string[],
    exerciseIds: string[],
  ): Promise<Usage> {
    return {
      lessons: new Set(
        [...this.progress.rows.values()]
          .map((row) => row.lesson_id)
          .filter((id) => lessonIds.includes(id)),
      ),
      exercises: new Set(
        this.attempts.rows
          .map((row) => row.exercise_id)
          .filter((id) => exerciseIds.includes(id)),
      ),
    };
  }
}
