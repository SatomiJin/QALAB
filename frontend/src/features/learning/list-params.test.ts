import { describe, expect, it } from 'vitest';
import { lastPage, listSearch, parseListParams } from './list-params';

const parse = (query: string) => parseListParams(new URLSearchParams(query));

describe('parseListParams', () => {
  it('defaults to page 1 of 20, all skills', () => {
    expect(parse('')).toEqual({ skill: undefined, page: 1, pageSize: 20 });
  });

  it('reads a valid skill, page and page size', () => {
    expect(parse('skill=test_design&page=3&pageSize=50')).toEqual({
      skill: 'test_design',
      page: 3,
      pageSize: 50,
    });
  });

  it.each([
    ['pageSize=30', { pageSize: 20 }],
    ['pageSize=abc', { pageSize: 20 }],
    ['page=0', { page: 1 }],
    ['page=-2', { page: 1 }],
    ['page=1.5', { page: 1 }],
    ['skill=Not-A-Code', { skill: undefined }],
  ])('falls back to defaults for %s', (query, expected) => {
    expect(parse(query)).toMatchObject(expected);
  });
});

describe('listSearch', () => {
  it('leaves out defaults', () => {
    expect(listSearch({ page: 1, pageSize: 20 })).toBe('');
    expect(listSearch({ skill: 'automation', page: 2, pageSize: 100 })).toBe(
      '?skill=automation&page=2&pageSize=100',
    );
  });

  it('round-trips with parseListParams', () => {
    const params = { skill: 'api_testing', page: 4, pageSize: 50 } as const;
    expect(parse(listSearch(params).slice(1))).toEqual(params);
  });
});

describe('lastPage', () => {
  it('is at least 1', () => {
    expect(lastPage(0, 20)).toBe(1);
    expect(lastPage(45, 20)).toBe(3);
    expect(lastPage(40, 20)).toBe(2);
  });
});
