import { describe, expect, it } from 'vitest';
import { answerFieldErrors, toAnswer, toFormValues } from './answers';
import {
  exerciseVerdict,
  kindOf,
  parsePracticeParams,
  plainText,
  practiceSearch,
} from './kinds';

const stats = (attemptCount: number, passed: boolean) => ({
  attemptCount,
  passed,
  bestScore: null,
  lastScore: null,
  lastAttemptedAt: null,
});

describe('kinds', () => {
  it('maps exercise types to Practice tabs', () => {
    expect(kindOf('multiple_choice')).toBe('quiz');
    expect(kindOf('classification')).toBe('quiz');
    expect(kindOf('test_case')).toBe('testCase');
    expect(kindOf('bug_report')).toBe('bugReport');
    expect(kindOf('scenario')).toBe('scenario');
  });

  it('gives an exercise a verdict from your attempts', () => {
    expect(exerciseVerdict(stats(0, false))).toBe('notRun');
    expect(exerciseVerdict(stats(2, false))).toBe('fail');
    expect(exerciseVerdict(stats(3, true))).toBe('pass');
  });

  it('reads list params with safe defaults and writes them without defaults', () => {
    const params = parsePracticeParams(
      new URLSearchParams(
        'skill=test_design&difficulty=hard&page=2&pageSize=50',
      ),
    );
    expect(params).toEqual({
      skill: 'test_design',
      difficulty: 'hard',
      page: 2,
      pageSize: 50,
    });
    expect(practiceSearch(params)).toBe(
      '?skill=test_design&difficulty=hard&page=2&pageSize=50',
    );
    expect(
      parsePracticeParams(
        new URLSearchParams('skill=Bad!&difficulty=extreme&page=0&pageSize=7'),
      ),
    ).toEqual({
      skill: undefined,
      difficulty: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(practiceSearch({ page: 1, pageSize: 20 })).toBe('');
  });
});

describe('plainText', () => {
  it('turns a Markdown question into one plain line', () => {
    expect(
      plainText(
        'Classify each as an **error**.\n\nSee [the lesson](/x) and `code`.',
      ),
    ).toBe('Classify each as an error. See the lesson and code.');
  });
});

describe('toAnswer', () => {
  it('multiple choice: a radio value or checkbox values become a list', () => {
    expect(toAnswer('multiple_choice', { selected: 'b' })).toEqual({
      selected: ['b'],
    });
    expect(toAnswer('multiple_choice', { selected: ['a', 'c'] })).toEqual({
      selected: ['a', 'c'],
    });
    expect(toAnswer('multiple_choice', {})).toEqual({ selected: [] });
  });

  it('classification: keeps only chosen categories', () => {
    expect(
      toAnswer('classification', { mapping: { a: 'x', b: undefined } }),
    ).toEqual({ mapping: { a: 'x' } });
  });

  it('test case: fills untouched fields and drops empty steps', () => {
    expect(
      toAnswer('test_case', { title: 'Login', steps: ['Open', '', undefined] }),
    ).toEqual({
      testCaseId: '',
      title: 'Login',
      preconditions: '',
      testData: '',
      steps: ['Open'],
      expectedResult: '',
      priority: null,
      testType: null,
    });
  });

  it('bug report: severity and priority are null until chosen', () => {
    const answer = toAnswer('bug_report', { severity: 'major' });
    expect(answer).toMatchObject({
      severity: 'major',
      priority: null,
      stepsToReproduce: [],
      attachment: '',
    });
  });
});

describe('toFormValues', () => {
  it('restores the last answer, with one empty step row', () => {
    expect(toFormValues('multiple_choice', { selected: ['b'] })).toEqual({
      selected: 'b',
    });
    expect(
      toFormValues('multiple_choice', { selected: ['a', 'b'] }, true),
    ).toEqual({
      selected: ['a', 'b'],
    });
    expect(toFormValues('test_case', { title: 'T', steps: [] })).toEqual({
      title: 'T',
      steps: [''],
    });
  });
});

describe('answerFieldErrors', () => {
  it('maps backend details onto form fields', () => {
    expect(
      answerFieldErrors([
        { field: 'answer.title', message: 'Fill in at least one field' },
        { field: 'answer.mapping.login', message: 'login must be classified' },
        { field: 'answer.steps[3]', message: 'too long' },
        { field: 'answer', message: 'must be an object' },
      ]),
    ).toEqual({
      fields: [
        { name: ['title'], errors: ['Fill in at least one field'] },
        { name: ['mapping', 'login'], errors: ['login must be classified'] },
        { name: ['steps'], errors: ['too long'] },
      ],
      other: ['must be an object'],
    });
  });
});
