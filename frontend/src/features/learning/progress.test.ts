import { describe, expect, it } from 'vitest';
import {
  lessonNumber,
  progressToReport,
  readingPercent,
  verdictFor,
} from './progress';

describe('verdictFor', () => {
  it('maps lesson statuses to verdicts', () => {
    expect(verdictFor('completed')).toBe('pass');
    expect(verdictFor('in_progress')).toBe('inProgress');
    expect(verdictFor('not_started')).toBe('notRun');
  });
});

describe('readingPercent', () => {
  it('is 0 before the article reaches the viewport bottom', () => {
    expect(readingPercent(900, 2000, 800)).toBe(0);
  });

  it('is the share of the article above the viewport bottom', () => {
    // Article starts 200px from the top: 600 of 2000px are visible or passed.
    expect(readingPercent(200, 2000, 800)).toBe(30);
    expect(readingPercent(-1200, 2000, 800)).toBe(100);
  });

  it('is 100 when a short article fits on screen', () => {
    expect(readingPercent(100, 400, 800)).toBe(100);
  });

  it('handles an empty article', () => {
    expect(readingPercent(0, 0, 800)).toBe(0);
  });
});

describe('progressToReport', () => {
  it('reports in 10-point steps', () => {
    expect(progressToReport(0, 9)).toBeNull();
    expect(progressToReport(0, 14)).toBe(10);
    expect(progressToReport(10, 19)).toBeNull();
    expect(progressToReport(10, 47)).toBe(40);
  });

  it('reports 100 exactly at the end', () => {
    expect(progressToReport(90, 100)).toBe(100);
    expect(progressToReport(100, 100)).toBeNull();
  });

  it('never reports a lower value', () => {
    expect(progressToReport(60, 30)).toBeNull();
  });
});

describe('lessonNumber', () => {
  it('numbers lessons within modules from 1', () => {
    expect(lessonNumber(0, 0)).toBe('1.1');
    expect(lessonNumber(1, 2)).toBe('2.3');
  });
});
