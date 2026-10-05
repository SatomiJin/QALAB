import { describe, expect, it } from 'vitest';
import type { AdminGlossaryTerm } from '../../types/api';
import {
  glossaryListSearch,
  glossaryPage,
  parseGlossaryListParams,
  termFieldErrors,
  termFormValues,
  termRequest,
  UNUSED,
} from './admin-glossary';

const term = (
  slug: string,
  over: Partial<AdminGlossaryTerm> = {},
): AdminGlossaryTerm => ({
  id: slug,
  slug,
  term: slug,
  viName: null,
  skill: 'fundamentals',
  matchPhrases: [slug],
  definitionEn: `About ${slug}`,
  definitionVi: `Về ${slug}`,
  related: [],
  status: 'published',
  relatedIds: [],
  usage: { lessons: 0, courseIds: [] },
  createdAt: '',
  updatedAt: '',
  ...over,
});

const TERMS = [
  term('Severity', {
    skill: 'defect_mgmt',
    usage: { lessons: 2, courseIds: ['c1'] },
  }),
  term('API', {
    skill: 'api_testing',
    status: 'draft',
    usage: { lessons: 1, courseIds: ['c2'] },
  }),
  term('Test case', {
    viName: 'Ca kiểm thử',
    usage: { lessons: 3, courseIds: ['c1', 'c2'] },
  }),
];

describe('glossary list params', () => {
  it('parses with safe defaults and writes without them', () => {
    const params = parseGlossaryListParams(
      new URLSearchParams(
        'q=%20case%20&skill=nope&status=draft&course=c1&page=0&pageSize=7',
      ),
    );
    expect(params).toEqual({
      search: 'case',
      skill: undefined,
      status: 'draft',
      course: 'c1',
      page: 1,
      pageSize: 20,
    });
    expect(glossaryListSearch(params)).toBe('q=case&status=draft&course=c1');
    expect(glossaryListSearch({ page: 1, pageSize: 20 })).toBe('');
  });
});

describe('glossaryPage', () => {
  const names = (params: object) =>
    glossaryPage(TERMS, { page: 1, pageSize: 20, ...params }).items.map(
      (t) => t.term,
    );

  it('sorts by term and filters by topic, status and course of use', () => {
    expect(names({})).toEqual(['API', 'Severity', 'Test case']);
    expect(names({ skill: 'api_testing' })).toEqual(['API']);
    expect(names({ status: 'published' })).toEqual(['Severity', 'Test case']);
    expect(names({ course: 'c2' })).toEqual(['API', 'Test case']);
  });

  it('finds Vietnamese names and lists unused terms', () => {
    expect(names({ search: 'ca kiem thu' })).toEqual(['Test case']);
    const unused = glossaryPage([...TERMS, term('Unused')], {
      page: 1,
      pageSize: 20,
      course: UNUSED,
    });
    expect(unused.items.map((t) => t.term)).toEqual(['Unused']);
  });

  it('pages the result and keeps the real total past the end', () => {
    expect(glossaryPage(TERMS, { page: 2, pageSize: 20 })).toEqual({
      items: [],
      total: 3,
    });
  });
});

describe('term form', () => {
  it('maps form values to a trimmed request', () => {
    expect(
      termRequest({
        ...termFormValues(),
        term: ' Test case ',
        slug: 'test-case',
        viName: '  ',
        matchPhrases: [' test case ', ''],
        definitionEn: ' A. ',
        definitionVi: ' B. ',
      }),
    ).toEqual({
      term: 'Test case',
      slug: 'test-case',
      viName: null,
      skill: 'fundamentals',
      status: 'draft',
      matchPhrases: ['test case'],
      definitionEn: 'A.',
      definitionVi: 'B.',
      relatedIds: [],
    });
  });

  it('puts indexed API errors on their field, naming the phrase', () => {
    const values = { ...termFormValues(), matchPhrases: ['ok', 'test case'] };
    expect(
      termFieldErrors(
        [
          {
            field: 'matchPhrases[1]',
            message: 'phrase is already used by "Test case"',
          },
          { field: 'relatedIds[0]', message: 'term does not exist' },
          { field: 'slug', message: 'slug is already used' },
          { field: 'createdBy', message: 'should not exist' },
        ],
        values,
      ),
    ).toEqual([
      {
        name: 'matchPhrases',
        errors: ['"test case": phrase is already used by "Test case"'],
      },
      { name: 'relatedIds', errors: ['term does not exist'] },
      { name: 'slug', errors: ['slug is already used'] },
    ]);
  });
});
