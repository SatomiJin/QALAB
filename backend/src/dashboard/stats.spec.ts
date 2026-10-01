import type { Feedback } from '../practice/grading.js';
import {
  addDays,
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

function skill(
  code: string,
  order: number,
  values: Partial<SkillProgressRow> = {},
): SkillProgressRow {
  return {
    skill_id: `s-${code}`,
    skill_code: code,
    skill_name: code,
    skill_order: order,
    total_lessons: 0,
    completed_lessons: 0,
    started_lessons: 0,
    total_exercises: 0,
    attempted_exercises: 0,
    passed_exercises: 0,
    average_score: null,
    ...values,
  };
}

function result(
  exercise_id: string,
  best_score: number,
  passed: boolean,
  best_feedback: Feedback = { type: 'multiple_choice', options: [] },
): ExerciseResultRow {
  return {
    exercise_id,
    attempt_count: 1,
    best_score,
    last_score: best_score,
    last_attempted_at: '2026-09-30T08:00:00Z',
    passed,
    best_feedback,
  };
}

const scenario = (concepts: [string, boolean][]): Feedback => ({
  type: 'scenario',
  parts: [],
  concepts: concepts.map(([concept, matched]) => ({ concept, matched })),
});

describe('percentOf / averageOf', () => {
  it('rounds and handles empty totals', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBe(0);
    expect(averageOf([])).toBeNull();
    expect(averageOf([70, 75])).toBe(73);
  });
});

describe('skillStatus', () => {
  it('follows the course rule', () => {
    expect(skillStatus(skill('a', 1))).toBe('not_started');
    expect(
      skillStatus(skill('a', 1, { total_lessons: 2, started_lessons: 1 })),
    ).toBe('in_progress');
    expect(
      skillStatus(
        skill('a', 1, {
          total_lessons: 2,
          completed_lessons: 2,
          started_lessons: 2,
        }),
      ),
    ).toBe('completed');
    // No published lessons: never "completed".
    expect(skillStatus(skill('a', 1, { total_lessons: 0 }))).toBe(
      'not_started',
    );
  });
});

describe('localDate / addDays', () => {
  it('uses the calendar date of the time zone', () => {
    const instant = new Date('2026-09-30T20:00:00Z');
    expect(localDate(instant, 'UTC')).toBe('2026-09-30');
    expect(localDate(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-10-01');
    expect(localDate(instant, 'America/New_York')).toBe('2026-09-30');
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('streakOf', () => {
  const today = '2026-09-30';

  it('is zero without activity', () => {
    const streak = streakOf([], today);
    expect(streak).toMatchObject({
      current: 0,
      longest: 0,
      activeToday: false,
    });
    expect(streak.days).toHaveLength(14);
    expect(streak.days[0].date).toBe('2026-09-17');
    expect(streak.days[13]).toEqual({ date: today, active: false });
  });

  it('counts back from today', () => {
    const streak = streakOf(['2026-09-30', '2026-09-29', '2026-09-28'], today);
    expect(streak).toMatchObject({ current: 3, longest: 3, activeToday: true });
  });

  it('stays current until a whole day is missed', () => {
    expect(streakOf(['2026-09-29', '2026-09-28'], today)).toMatchObject({
      current: 2,
      activeToday: false,
    });
    expect(streakOf(['2026-09-28', '2026-09-27'], today).current).toBe(0);
  });

  it('keeps the longest run and ignores duplicates and order', () => {
    const streak = streakOf(
      [
        '2026-09-30',
        '2026-09-10',
        '2026-09-11',
        '2026-09-12',
        '2026-09-11',
        '2026-09-13',
        '2026-09-29',
      ],
      today,
    );
    expect(streak).toMatchObject({ current: 2, longest: 4 });
    expect(streak.days.filter((day) => day.active)).toHaveLength(2);
  });
});

describe('weakSkills', () => {
  const placements = new Map<string, ExercisePlacement>([
    ['e1', { id: 'e1', type: 'test_case', skillId: 's-design', position: 0 }],
    ['e2', { id: 'e2', type: 'scenario', skillId: 's-design', position: 1 }],
    ['e3', { id: 'e3', type: 'bug_report', skillId: 's-bugs', position: 2 }],
  ]);

  it('lists skills below the pass mark, lowest first, with the worst failed exercise', () => {
    const rows = [
      skill('fundamentals', 1, { attempted_exercises: 2, average_score: 90 }),
      skill('design', 2, { attempted_exercises: 2, average_score: 45 }),
      skill('bugs', 3, { attempted_exercises: 1, average_score: 60 }),
      skill('api', 4),
    ];
    const results = [
      result('e1', 50, false),
      result('e2', 40, false),
      result('e3', 60, false),
    ];
    const weak = weakSkills(rows, results, placements);
    expect(weak.map((entry) => entry.row.skill_code)).toEqual([
      'design',
      'bugs',
    ]);
    expect(weak[0].retry).toEqual({
      exercise: placements.get('e2'),
      bestScore: 40,
    });
  });

  it('never offers a passed or invisible exercise to retry', () => {
    const rows = [
      skill('design', 2, { attempted_exercises: 2, average_score: 65 }),
    ];
    const results = [result('e1', 90, true), result('gone', 10, false)];
    expect(weakSkills(rows, results, placements)[0].retry).toBeNull();
  });

  it('breaks ties by skill order and stops at the limit', () => {
    const rows = ['d', 'c', 'b', 'a'].map((code, index) =>
      skill(code, 4 - index, { attempted_exercises: 1, average_score: 50 }),
    );
    expect(
      weakSkills(rows, [], placements).map((entry) => entry.row.skill_code),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('weakConcepts', () => {
  it('counts misses across best answers, most often missed first', () => {
    const concepts = weakConcepts([
      result(
        'e1',
        40,
        false,
        scenario([
          ['Boundary values', false],
          ['Expected result', true],
        ]),
      ),
      result(
        'e2',
        60,
        false,
        scenario([
          ['boundary values', false],
          ['Expected result', false],
          ['Severity', true],
        ]),
      ),
      result('e3', 100, true),
    ]);
    expect(concepts).toEqual([
      { concept: 'Boundary values', missed: 2, checked: 2 },
      { concept: 'Expected result', missed: 1, checked: 2 },
    ]);
  });

  it('keeps at most five', () => {
    const many = scenario(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => [name, false]),
    );
    expect(weakConcepts([result('e1', 0, false, many)])).toHaveLength(5);
  });
});
