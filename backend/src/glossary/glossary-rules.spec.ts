import { fileURLToPath } from 'node:url';
import {
  phraseErrors,
  relatedErrors,
  TermMatcher,
  termUsage,
} from './glossary-rules.js';
import {
  loadGlossarySeed,
  planGlossaryWrites,
  seedTermId,
  validateGlossarySeed,
  type SeedTerm,
} from './glossary-seed.js';

const terms = [
  { id: 'tc', term: 'Test case', matchPhrases: ['test case'] },
  { id: 'rest', term: 'REST', matchPhrases: ['REST'] },
  { id: 'nf', term: 'Non-functional', matchPhrases: ['non-functional'] },
  { id: 'f', term: 'Functional', matchPhrases: ['functional testing'] },
  { id: 'wf', term: "Won't fix", matchPhrases: ["won't fix"] },
];

describe('phraseErrors', () => {
  it('rejects a phrase listed twice or owned by another term (case-insensitive)', () => {
    expect(
      phraseErrors(null, ['Test Case', 'unit test', 'UNIT TEST'], terms),
    ).toEqual([
      {
        field: 'matchPhrases[0]',
        message: 'phrase is already used by "Test case"',
      },
      { field: 'matchPhrases[2]', message: 'phrase is listed twice' },
    ]);
  });

  it("ignores the term's own phrases when it is edited", () => {
    expect(phraseErrors('tc', ['test case'], terms)).toEqual([]);
  });

  it('treats both apostrophes as the same phrase', () => {
    expect(phraseErrors(null, ['won’t fix'], terms)).toHaveLength(1);
  });
});

describe('relatedErrors', () => {
  it('rejects itself, duplicates and unknown ids', () => {
    expect(
      relatedErrors('a', ['a', 'b', 'b', 'z'], new Set(['a', 'b'])),
    ).toEqual([
      { field: 'relatedIds[0]', message: 'a term cannot be related to itself' },
      { field: 'relatedIds[2]', message: 'term is listed twice' },
      { field: 'relatedIds[3]', message: 'term does not exist' },
    ]);
  });
});

describe('TermMatcher', () => {
  const matcher = new TermMatcher(terms);
  const found = (text: string) => [...matcher.termsIn(text)].sort();

  it('finds whole words, plurals, acronyms in capitals only', () => {
    expect(found('Write test cases for the REST API.')).toEqual(['rest', 'tc']);
    expect(found('Take a rest.')).toEqual([]);
    expect(found('TestCase and xtest case')).toEqual([]);
  });

  it('keeps hyphenated words whole and skips code', () => {
    expect(found('Non-functional checks')).toEqual(['nf']);
    expect(found('`test case` and\n```\nREST test case\n```\n')).toEqual([]);
  });

  it('matches inside Vietnamese text', () => {
    expect(found('Viết test case và bug được đánh won’t fix.')).toEqual([
      'tc',
      'wf',
    ]);
  });
});

describe('termUsage', () => {
  it('counts lessons and courses per term', () => {
    const usage = termUsage(terms, [
      { lessonId: 'l1', courseId: 'c2', contentMd: 'A test case.' },
      { lessonId: 'l2', courseId: 'c1', contentMd: 'Test case, test case.' },
      { lessonId: 'l3', courseId: 'c1', contentMd: 'Nothing here.' },
    ]);
    expect(usage.get('tc')).toEqual({ lessons: 2, courseIds: ['c1', 'c2'] });
    expect(usage.get('rest')).toEqual({ lessons: 0, courseIds: [] });
  });
});

const seed = (over: Partial<SeedTerm> = {}): SeedTerm => ({
  slug: 'test-case',
  term: 'Test case',
  skill: 'test_docs',
  match: ['test case'],
  definition: { en: 'A case.', vi: 'Một ca.' },
  related: [],
  ...over,
});

describe('glossary seed', () => {
  it('the versioned file is valid', () => {
    const path = fileURLToPath(
      new URL('../../seed/glossary/terms.json', import.meta.url),
    );
    const { terms: loaded, errors } = loadGlossarySeed(path);
    expect(errors).toEqual([]);
    expect(loaded.length).toBeGreaterThan(50);
  });

  it('reports unknown fields, limits, shared phrases and bad related slugs', () => {
    const { errors } = validateGlossarySeed([
      seed({ related: ['nope'] }),
      seed({ slug: 'other', match: ['Test Case'] }),
      { ...seed({ slug: 'Bad Slug' }), extra: 1 },
    ]);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown field extra'),
        expect.stringContaining('invalid slug'),
      ]),
    );
    const second = validateGlossarySeed([
      seed({ related: ['nope'] }),
      seed({ slug: 'other', match: ['Test Case'] }),
    ]);
    expect(second.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('related nope is not another term'),
        expect.stringContaining('already used'),
      ]),
    );
  });

  it('inserts missing terms (published, ids by slug), keeps stored ones unless --update', () => {
    const terms = [
      seed(),
      seed({
        slug: 'test-plan',
        term: 'Test plan',
        match: ['test plan'],
        related: ['test-case'],
      }),
    ];
    const stored = [
      {
        id: 'db-1',
        slug: 'test-case',
        term: 'Test case',
        match_phrases: ['test case'],
        status: 'draft' as const,
      },
    ];

    const insert = planGlossaryWrites(terms, stored, { update: false });
    expect(insert.write.map((row) => row.slug)).toEqual(['test-plan']);
    expect(insert.write[0]).toMatchObject({
      id: seedTermId('test-plan'),
      status: 'published',
      related_ids: ['db-1'],
    });

    const update = planGlossaryWrites(terms, stored, { update: true });
    expect(update.write.map((row) => [row.id, row.status])).toEqual([
      ['db-1', 'draft'],
      [seedTermId('test-plan'), 'published'],
    ]);
  });

  it('skips a term whose phrase a CMS term already uses', () => {
    const cms = [
      {
        id: 'cms',
        slug: 'tc',
        term: 'TC',
        match_phrases: ['TEST CASE'],
        status: 'published' as const,
      },
    ];
    const plan = planGlossaryWrites([seed()], cms, { update: false });
    expect(plan.write).toEqual([]);
    expect(plan.skipped).toEqual(['test-case: phrase is already used by "TC"']);
  });
});
