import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import type { AdminExercise } from '../../types/api';
import {
  adminListSearch,
  moveItem,
  parseAdminListParams,
  slugify,
} from './content';
import {
  emptyExerciseValues,
  exerciseFieldErrors,
  nextLabelId,
  toExercisePayload,
  toExerciseValues,
} from './exercise-form';

describe('slugify', () => {
  it('makes lowercase dashed slugs without accents', () => {
    expect(slugify('Boundary Value Analysis')).toBe('boundary-value-analysis');
    expect(slugify('  Phân vùng tương đương!  ')).toBe('phan-vung-tuong-duong');
    expect(slugify('Smoke vs. Sanity -- 101')).toBe('smoke-vs-sanity-101');
    expect(slugify('***')).toBe('');
  });

  it('keeps to 100 characters without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(99)} b`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('moveItem', () => {
  it('moves an entry and ignores moves out of range', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});

describe('admin list params', () => {
  it('reads safe values and writes only non-defaults', () => {
    const params = parseAdminListParams(
      new URLSearchParams('skill=test_design&status=draft&page=2&pageSize=50'),
    );
    expect(params).toEqual({
      skill: 'test_design',
      status: 'draft',
      page: 2,
      pageSize: 50,
    });
    expect(adminListSearch(params).toString()).toBe(
      'skill=test_design&status=draft&page=2&pageSize=50',
    );
    expect(
      parseAdminListParams(
        new URLSearchParams('skill=BAD!&status=gone&page=-1&pageSize=7'),
      ),
    ).toEqual({ skill: undefined, status: undefined, page: 1, pageSize: 20 });
    expect(adminListSearch({ page: 1, pageSize: 20 }).toString()).toBe('');
  });
});

describe('exercise form', () => {
  it('gives new labels unused ids', () => {
    expect(nextLabelId([{ id: 'a' }, { id: 'c' }], 'option')).toBe('b');
    expect(nextLabelId([{ id: 'item-1' }], 'item')).toBe('item-2');
  });

  it('builds a multiple choice prompt and key', () => {
    const values = {
      ...emptyExerciseValues('multiple_choice'),
      options: [
        { id: 'a', text: ' First ', correct: false },
        { id: 'b', text: 'Second', correct: true },
      ],
    };
    expect(toExercisePayload('multiple_choice', values)).toEqual({
      promptData: {
        options: [
          { id: 'a', text: 'First' },
          { id: 'b', text: 'Second' },
        ],
        multiple: false,
      },
      answerData: { correct: ['b'] },
    });
  });

  it('builds a classification mapping from the chosen categories', () => {
    const values = {
      ...emptyExerciseValues('classification'),
      categories: [
        { id: 'category-1', text: 'Functional' },
        { id: 'category-2', text: 'Non-functional' },
      ],
      items: [
        { id: 'item-1', text: 'Login', category: 'category-1' },
        { id: 'item-2', text: 'Speed' },
      ],
    };
    const payload = toExercisePayload('classification', values);
    expect(payload.answerData).toEqual({ mapping: { 'item-1': 'category-1' } });
    expect(payload.promptData.items).toHaveLength(2);
  });

  it('builds free-text keys with keywords split on commas', () => {
    const values = {
      ...emptyExerciseValues('bug_report'),
      requiredFields: ['title', 'severity'],
      expectedSeverity: 'major' as const,
      expectedPriority: 'high' as const,
      concepts: [
        { concept: 'Boundary', keywords: 'boundary, edge ,, limit' },
        { concept: ' ', keywords: ' ' },
      ],
      modelAnswer: 'Model',
      rubric: [{ id: 'rubric-1', text: 'Has steps' }],
    };
    expect(toExercisePayload('bug_report', values)).toEqual({
      promptData: {},
      answerData: {
        requiredFields: ['title', 'severity'],
        expectedSeverity: 'major',
        expectedPriority: 'high',
        expectedConcepts: [
          { concept: 'Boundary', keywords: ['boundary', 'edge', 'limit'] },
        ],
        modelAnswer: 'Model',
        rubric: [{ id: 'rubric-1', text: 'Has steps' }],
      },
    });
    expect(toExercisePayload('scenario', values).answerData).not.toHaveProperty(
      'requiredFields',
    );
  });

  it('round-trips a stored exercise, keeping ids', () => {
    const exercise = {
      type: 'classification',
      question: 'Sort them',
      difficulty: 'medium',
      status: 'published',
      explanation: 'Why',
      promptData: {
        categories: [
          { id: 'f', text: 'F' },
          { id: 'n', text: 'N' },
        ],
        items: [{ id: 'login', text: 'Login' }],
      },
      answerData: { mapping: { login: 'f' } },
    } as unknown as AdminExercise;
    const values = toExerciseValues(exercise);
    expect(values.items).toEqual([
      { id: 'login', text: 'Login', category: 'f' },
    ]);
    expect(toExercisePayload('classification', values).answerData).toEqual({
      mapping: { login: 'f' },
    });
  });

  it('maps backend errors onto form fields, the rest to the alert', () => {
    const values = {
      ...emptyExerciseValues('classification'),
      items: [
        { id: 'item-1', text: 'A' },
        { id: 'login', text: 'B' },
      ],
    };
    const error = new ApiError({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: [
        {
          field: 'promptData.items[1].text',
          message: 'text must be 1-500 characters',
        },
        {
          field: 'answerData.mapping.login',
          message: 'login must be classified',
        },
        { field: 'answerData.expectedConcepts[0].keywords', message: 'k' },
        {
          field: 'promptData.categories',
          message: 'categories ids must be unique',
        },
        { field: 'question', message: 'question should not be empty' },
      ],
    });
    const { fields, other } = exerciseFieldErrors(error, values);
    expect(fields.map((f) => f.name)).toEqual([
      ['items', 1, 'text'],
      ['items', 1, 'category'],
      ['concepts', 0, 'keywords'],
      ['question'],
    ]);
    expect(other).toEqual(['categories ids must be unique']);
  });
});
