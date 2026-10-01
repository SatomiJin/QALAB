import { describe, expect, it } from 'vitest';
import type { Activity } from '../../types/api';
import {
  activityPath,
  activityVerdict,
  browserTimeZone,
  dayToDate,
} from './dashboard';

const base: Activity = {
  kind: 'lesson_started',
  occurredAt: '2026-09-30T08:00:00Z',
  lesson: { id: 'l1', title: 'Lesson' },
  course: { id: 'c1', slug: 'c', title: 'Course' },
  exercise: null,
  score: null,
  isCorrect: null,
};

describe('browserTimeZone', () => {
  it('uses the resolved zone', () => {
    expect(browserTimeZone(() => 'Asia/Ho_Chi_Minh')).toBe('Asia/Ho_Chi_Minh');
  });

  it('falls back to UTC when unknown, too long or failing', () => {
    expect(browserTimeZone(() => undefined)).toBe('UTC');
    expect(browserTimeZone(() => 'A'.repeat(65))).toBe('UTC');
    expect(
      browserTimeZone(() => {
        throw new Error('no Intl');
      }),
    ).toBe('UTC');
  });
});

describe('activityVerdict / activityPath', () => {
  it('maps lessons and attempts to verdicts', () => {
    expect(activityVerdict(base)).toBe('inProgress');
    expect(activityVerdict({ ...base, kind: 'lesson_completed' })).toBe('pass');
    const attempt: Activity = {
      ...base,
      kind: 'exercise_attempted',
      exercise: { id: 'e1', type: 'scenario' },
      score: 40,
      isCorrect: false,
    };
    expect(activityVerdict(attempt)).toBe('fail');
    expect(activityVerdict({ ...attempt, isCorrect: true })).toBe('pass');
    expect(activityPath(attempt)).toBe('/practice/exercises/e1');
    expect(activityPath(base)).toBe('/learning/lessons/l1');
  });
});

describe('dayToDate', () => {
  it('keeps the calendar day in any local zone', () => {
    const date = dayToDate('2026-10-01');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 9, 1,
    ]);
  });
});
