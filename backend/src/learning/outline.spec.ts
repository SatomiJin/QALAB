import type {
  CourseRow,
  LessonSummaryRow,
  ModuleRow,
  SkillRow,
} from './content.repository.js';
import type { LessonProgressRow } from './lesson-progress.repository.js';
import {
  buildOutlines,
  chooseContinue,
  neighbours,
  nextLesson,
  nextProgress,
  sortByCatalogueOrder,
  summarizeProgress,
} from './outline.js';

const skills: SkillRow[] = [
  {
    id: 's1',
    code: 'fundamentals',
    name: 'Fundamentals',
    description: '',
    order_index: 1,
  },
  {
    id: 's2',
    code: 'test_design',
    name: 'Test design',
    description: '',
    order_index: 2,
  },
];

function course(id: string, skill_id: string, order_index = 1): CourseRow {
  return { id, skill_id, slug: id, title: id, description: '', order_index };
}

function mod(id: string, course_id: string, order_index = 1): ModuleRow {
  return { id, course_id, title: id, description: '', order_index };
}

function lesson(id: string, module_id: string, minutes = 5): LessonSummaryRow {
  return {
    id,
    module_id,
    slug: id,
    title: id,
    estimated_minutes: minutes,
    order_index: 1,
  };
}

function progress(
  lesson_id: string,
  status: LessonProgressRow['status'],
  last_accessed_at = '2026-09-30T10:00:00.000Z',
): LessonProgressRow {
  return {
    lesson_id,
    status,
    progress_percent: status === 'completed' ? 100 : 30,
    started_at: '2026-09-30T09:00:00.000Z',
    completed_at: status === 'completed' ? last_accessed_at : null,
    last_accessed_at,
  };
}

// Course A (skill 2): modules A1 [a1, a2], A2 [a3]. Course B (skill 1): [b1].
const outlines = buildOutlines(
  [course('A', 's2'), course('B', 's1')],
  [mod('A1', 'A', 1), mod('A2', 'A', 2), mod('B1', 'B')],
  [
    lesson('a1', 'A1', 6),
    lesson('a2', 'A1', 7),
    lesson('a3', 'A2', 8),
    lesson('b1', 'B1'),
    lesson('orphan', 'unpublished-module'),
  ],
  skills,
);
const [courseA, courseB] = outlines;

const byLesson = (...rows: LessonProgressRow[]) =>
  new Map(rows.map((row) => [row.lesson_id, row]));

describe('buildOutlines', () => {
  it('groups lessons under modules in reading order', () => {
    expect(courseA.modules.map((m) => m.module.id)).toEqual(['A1', 'A2']);
    expect(courseA.lessons.map((l) => l.id)).toEqual(['a1', 'a2', 'a3']);
    expect(courseA.skill?.code).toBe('test_design');
  });

  it('drops lessons whose module is not published', () => {
    const all = outlines.flatMap((o) => o.lessons.map((l) => l.id));
    expect(all).not.toContain('orphan');
  });

  it('sorts courses by skill order, then course order', () => {
    expect(sortByCatalogueOrder(outlines).map((o) => o.course.id)).toEqual([
      'B',
      'A',
    ]);
  });
});

describe('summarizeProgress', () => {
  it('is not_started without progress', () => {
    expect(summarizeProgress(courseA, byLesson())).toEqual({
      totalLessons: 3,
      completedLessons: 0,
      status: 'not_started',
    });
  });

  it('is in_progress once any lesson is opened', () => {
    expect(
      summarizeProgress(courseA, byLesson(progress('a2', 'in_progress'))),
    ).toMatchObject({ completedLessons: 0, status: 'in_progress' });
  });

  it('is completed only when every lesson is completed', () => {
    const some = byLesson(
      progress('a1', 'completed'),
      progress('a2', 'completed'),
    );
    expect(summarizeProgress(courseA, some)).toMatchObject({
      completedLessons: 2,
      status: 'in_progress',
    });
    some.set('a3', progress('a3', 'completed'));
    expect(summarizeProgress(courseA, some).status).toBe('completed');
  });

  it('never calls an empty course completed', () => {
    const [empty] = buildOutlines([course('E', 's1')], [], [], skills);
    expect(summarizeProgress(empty, byLesson()).status).toBe('not_started');
  });
});

describe('nextLesson / neighbours', () => {
  it('returns the first lesson not completed, across modules', () => {
    const done = byLesson(
      progress('a1', 'completed'),
      progress('a2', 'completed'),
    );
    expect(nextLesson(courseA, done)?.id).toBe('a3');
  });

  it('returns null when all lessons are completed', () => {
    expect(
      nextLesson(courseB, byLesson(progress('b1', 'completed'))),
    ).toBeNull();
  });

  it('links previous and next lessons across module boundaries', () => {
    expect(neighbours(courseA, 'a2')).toEqual({
      previous: expect.objectContaining({ id: 'a1' }),
      next: expect.objectContaining({ id: 'a3' }),
    });
    expect(neighbours(courseA, 'a1').previous).toBeNull();
    expect(neighbours(courseA, 'a3').next).toBeNull();
  });
});

describe('nextProgress', () => {
  const now = '2026-09-30T12:00:00.000Z';

  it('opens a lesson: in progress, started now', () => {
    expect(nextProgress(null, {}, 'a1', now)).toEqual({
      lesson_id: 'a1',
      status: 'in_progress',
      progress_percent: 0,
      started_at: now,
      completed_at: null,
      last_accessed_at: now,
    });
  });

  it('never lowers the percentage and keeps the start time', () => {
    const existing = { ...progress('a1', 'in_progress'), progress_percent: 60 };
    const next = nextProgress(existing, { progressPercent: 20 }, 'a1', now);
    expect(next.progress_percent).toBe(60);
    expect(next.started_at).toBe(existing.started_at);
    expect(next.last_accessed_at).toBe(now);
  });

  it('raises the percentage', () => {
    const existing = progress('a1', 'in_progress');
    expect(
      nextProgress(existing, { progressPercent: 80 }, 'a1', now)
        .progress_percent,
    ).toBe(80);
  });

  it('completes: 100% and completed now', () => {
    expect(nextProgress(null, { complete: true }, 'a1', now)).toMatchObject({
      status: 'completed',
      progress_percent: 100,
      completed_at: now,
      started_at: now,
    });
  });

  it('keeps a completed lesson completed, with its first completion time', () => {
    const existing = progress('a1', 'completed', '2026-09-01T00:00:00.000Z');
    const next = nextProgress(
      existing,
      { complete: false, progressPercent: 10 },
      'a1',
      now,
    );
    expect(next).toMatchObject({
      status: 'completed',
      progress_percent: 100,
      completed_at: '2026-09-01T00:00:00.000Z',
      last_accessed_at: now,
    });
  });
});

describe('chooseContinue', () => {
  const catalogue = sortByCatalogueOrder(outlines); // B, A

  it('suggests the first lesson of the catalogue when nothing was opened', () => {
    expect(chooseContinue(catalogue, [])).toMatchObject({
      reason: 'start',
      lesson: { id: 'b1' },
    });
  });

  it('resumes the most recently opened unfinished lesson', () => {
    const recent = [
      progress('a2', 'in_progress', '2026-09-30T11:00:00.000Z'),
      progress('a1', 'in_progress', '2026-09-30T10:00:00.000Z'),
    ];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'resume',
      lesson: { id: 'a2' },
      outline: { course: { id: 'A' } },
    });
  });

  it('moves to the next lesson after the last completed one', () => {
    const recent = [progress('a1', 'completed')];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'next',
      lesson: { id: 'a2' },
    });
  });

  it('resumes the next lesson when it was already opened earlier', () => {
    const recent = [
      progress('a1', 'completed', '2026-09-30T11:00:00.000Z'),
      progress('a2', 'in_progress', '2026-09-30T10:00:00.000Z'),
    ];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'resume',
      lesson: { id: 'a2' },
    });
  });

  it('falls back to another unfinished lesson when that course is done', () => {
    const recent = [
      progress('b1', 'completed', '2026-09-30T11:00:00.000Z'),
      progress('a3', 'in_progress', '2026-09-30T10:00:00.000Z'),
    ];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'resume',
      lesson: { id: 'a3' },
    });
  });

  it('then suggests the first unfinished lesson in catalogue order', () => {
    const recent = [progress('b1', 'completed')];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'next',
      lesson: { id: 'a1' },
    });
  });

  it('ignores progress on lessons that are no longer published', () => {
    const recent = [progress('orphan', 'in_progress')];
    expect(chooseContinue(catalogue, recent)).toMatchObject({
      reason: 'start',
      lesson: { id: 'b1' },
    });
  });

  it('returns null when everything is completed', () => {
    const recent = ['a1', 'a2', 'a3', 'b1'].map((id) =>
      progress(id, 'completed'),
    );
    expect(chooseContinue(catalogue, recent)).toBeNull();
  });
});
