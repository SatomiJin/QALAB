import type {
  AnswerKeyByType,
  BugReportAnswer,
  PromptByType,
  TestCaseAnswer,
} from './exercise-schema.js';
import {
  containsKeyword,
  grade,
  matchConcepts,
  normalizeText,
  PASS_SCORE,
} from './grading.js';

const mcPrompt: PromptByType['multiple_choice'] = {
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ],
  multiple: true,
};

const classificationPrompt: PromptByType['classification'] = {
  categories: [
    { id: 'functional', text: 'Functional' },
    { id: 'non-functional', text: 'Non-functional' },
  ],
  items: [
    { id: 'login', text: 'Login works' },
    { id: 'speed', text: 'Page loads in 2 s' },
    { id: 'search', text: 'Search finds products' },
    { id: 'a11y', text: 'Screen reader support' },
  ],
};

const boundaryConcepts = [
  { concept: 'Boundary', keywords: ['boundary', 'edge', 'limit'] },
  { concept: 'Minimum', keywords: ['min', 'minimum', 'lowest'] },
  { concept: 'Maximum', keywords: ['max', 'maximum', 'highest'] },
  { concept: 'Invalid', keywords: ['invalid', 'out of range'] },
];

const emptyTestCase: TestCaseAnswer = {
  testCaseId: '',
  title: '',
  preconditions: '',
  testData: '',
  steps: [],
  expectedResult: '',
  priority: null,
  testType: null,
};

const emptyBugReport: BugReportAnswer = {
  bugId: '',
  title: '',
  environment: '',
  preconditions: '',
  stepsToReproduce: [],
  actualResult: '',
  expectedResult: '',
  severity: null,
  priority: null,
  attachment: '',
};

const freeText = { modelAnswer: 'Model', rubric: [{ id: 'r1', text: 'R' }] };

describe('keyword matching', () => {
  it('ignores case and Vietnamese accents', () => {
    expect(normalizeText('Giá Trị BIÊN Đúng')).toBe('gia tri bien dung');
    expect(containsKeyword(normalizeText('Giá trị biên'), 'gia tri bien')).toBe(
      true,
    );
    expect(containsKeyword(normalizeText('BOUNDARY value'), 'boundary')).toBe(
      true,
    );
  });

  it('matches at the start of a word, so plurals count', () => {
    const text = normalizeText('Check the boundaries and the limits.');
    expect(containsKeyword(text, 'boundar')).toBe(true);
    expect(containsKeyword(text, 'limit')).toBe(true);
    expect(containsKeyword(text, 'imits')).toBe(false);
  });

  it('matches multi-word keywords across any whitespace', () => {
    const text = normalizeText('A value out\nof   range is rejected');
    expect(containsKeyword(text, 'out of range')).toBe(true);
  });

  it('treats regex characters in keywords literally', () => {
    expect(containsKeyword(normalizeText('Use C++ here'), 'c++')).toBe(true);
    expect(containsKeyword(normalizeText('ccc'), 'c.')).toBe(false);
  });

  it('never matches an empty keyword', () => {
    expect(containsKeyword('anything', '   ')).toBe(false);
  });

  it('reports each concept once, matched by any keyword', () => {
    expect(
      matchConcepts(['Test the lowest and highest value'], boundaryConcepts),
    ).toEqual([
      { concept: 'Boundary', matched: false },
      { concept: 'Minimum', matched: true },
      { concept: 'Maximum', matched: true },
      { concept: 'Invalid', matched: false },
    ]);
  });
});

describe('grade: multiple_choice', () => {
  const key: AnswerKeyByType['multiple_choice'] = { correct: ['a', 'c'] };

  it('scores 100 for the exact set, in any order', () => {
    const result = grade('multiple_choice', mcPrompt, key, {
      selected: ['c', 'a'],
    });
    expect(result.score).toBe(100);
    expect(result.isCorrect).toBe(true);
    expect(result.feedback.options).toEqual([
      { id: 'a', selected: true, correct: true },
      { id: 'b', selected: false, correct: false },
      { id: 'c', selected: true, correct: true },
    ]);
  });

  it('scores 0 for a subset, a superset or a wrong option', () => {
    for (const selected of [['a'], ['a', 'b', 'c'], ['b']]) {
      const result = grade('multiple_choice', mcPrompt, key, { selected });
      expect(result).toMatchObject({ score: 0, isCorrect: false });
    }
  });
});

describe('grade: classification', () => {
  const key: AnswerKeyByType['classification'] = {
    mapping: {
      login: 'functional',
      speed: 'non-functional',
      search: 'functional',
      a11y: 'non-functional',
    },
  };

  it('scores the share of correctly classified items', () => {
    const result = grade('classification', classificationPrompt, key, {
      mapping: {
        login: 'functional',
        speed: 'functional',
        search: 'functional',
        a11y: 'non-functional',
      },
    });
    expect(result.score).toBe(75);
    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toMatchObject({ correctCount: 3, total: 4 });
    expect(result.feedback.items[1]).toEqual({
      id: 'speed',
      chosen: 'functional',
      correct: 'non-functional',
      isCorrect: false,
    });
  });

  it('is correct only when every item is right', () => {
    const result = grade('classification', classificationPrompt, key, {
      mapping: key.mapping,
    });
    expect(result).toMatchObject({ score: 100, isCorrect: true });
  });

  it('rounds the percentage', () => {
    const three = {
      ...classificationPrompt,
      items: classificationPrompt.items.slice(0, 3),
    };
    const result = grade('classification', three, key, {
      mapping: {
        login: 'functional',
        speed: 'functional',
        search: 'functional',
      },
    });
    expect(result.score).toBe(67);
  });
});

describe('grade: test_case', () => {
  const key: AnswerKeyByType['test_case'] = {
    requiredFields: ['title', 'steps', 'expectedResult', 'priority'],
    expectedConcepts: boundaryConcepts,
    ...freeText,
  };

  it('combines required fields (40 %) and concept coverage (60 %)', () => {
    const result = grade('test_case', {}, key, {
      ...emptyTestCase,
      title: 'Age field accepts the minimum value',
      steps: ['Enter 18', 'Enter the maximum 65'],
      // expectedResult and priority missing: 2 of 4 fields
    });
    // fields 50 × 0.4 + concepts (min, max = 2 of 4) 50 × 0.6 = 50
    expect(result.score).toBe(50);
    expect(result.isCorrect).toBe(false);
    expect(result.feedback.fields).toEqual([
      { field: 'title', present: true },
      { field: 'steps', present: true },
      { field: 'expectedResult', present: false },
      { field: 'priority', present: false },
    ]);
    expect(result.feedback.parts).toEqual([
      { part: 'fields', score: 50, weight: 40 },
      { part: 'concepts', score: 50, weight: 60 },
    ]);
  });

  it(`passes at ${PASS_SCORE}`, () => {
    const result = grade('test_case', {}, key, {
      ...emptyTestCase,
      title: 'Boundary values of age',
      steps: ['Enter the minimum 18', 'Enter the maximum 65', 'Enter 17'],
      expectedResult: '17 is rejected as invalid',
      priority: 'high',
    });
    expect(result).toMatchObject({ score: 100, isCorrect: true });
  });

  it('reweights when the key has no concepts', () => {
    const result = grade(
      'test_case',
      {},
      { ...key, expectedConcepts: [] },
      {
        ...emptyTestCase,
        title: 'T',
        steps: ['s'],
        expectedResult: 'e',
        priority: 'low',
      },
    );
    expect(result.score).toBe(100);
    expect(result.feedback.parts).toEqual([
      { part: 'fields', score: 100, weight: 100 },
    ]);
  });

  it('does not search the test case id for concepts', () => {
    const result = grade(
      'test_case',
      {},
      { ...key, requiredFields: [] },
      { ...emptyTestCase, testCaseId: 'boundary-min-max-invalid', title: 'x' },
    );
    expect(result.score).toBe(0);
  });
});

describe('grade: bug_report', () => {
  const key: AnswerKeyByType['bug_report'] = {
    requiredFields: [
      'title',
      'stepsToReproduce',
      'actualResult',
      'expectedResult',
    ],
    expectedSeverity: 'major',
    expectedPriority: 'high',
    expectedConcepts: [
      { concept: 'Checkout', keywords: ['checkout'] },
      { concept: 'Error 500', keywords: ['500', 'server error'] },
    ],
    ...freeText,
  };

  const full: BugReportAnswer = {
    ...emptyBugReport,
    title: 'Checkout fails with a server error',
    stepsToReproduce: ['Add an item', 'Press Pay'],
    actualResult: 'HTTP 500 page',
    expectedResult: 'Order confirmation',
    severity: 'major',
    priority: 'high',
  };

  it('scores fields 30 %, severity 20 %, priority 20 %, concepts 30 %', () => {
    const result = grade('bug_report', {}, key, full);
    expect(result).toMatchObject({ score: 100, isCorrect: true });
    expect(result.feedback.parts.map((p) => [p.part, p.weight])).toEqual([
      ['fields', 30],
      ['severity', 20],
      ['priority', 20],
      ['concepts', 30],
    ]);
  });

  it('gives no credit for a wrong severity or priority', () => {
    const result = grade('bug_report', {}, key, {
      ...full,
      severity: 'critical',
      priority: null,
    });
    expect(result.score).toBe(60);
    expect(result.isCorrect).toBe(false);
    expect(result.feedback.severity).toEqual({
      expected: 'major',
      given: 'critical',
      match: false,
    });
    expect(result.feedback.priority).toEqual({
      expected: 'high',
      given: null,
      match: false,
    });
  });

  it('counts an empty steps list as missing', () => {
    const result = grade('bug_report', {}, key, {
      ...full,
      stepsToReproduce: [],
    });
    expect(result.feedback.fields[1]).toEqual({
      field: 'stepsToReproduce',
      present: false,
    });
    // fields 75 × 0.3 + 20 + 20 + concepts 100 × 0.3 = 92.5 → 93
    expect(result.score).toBe(93);
  });
});

describe('grade: scenario', () => {
  const key: AnswerKeyByType['scenario'] = {
    expectedConcepts: boundaryConcepts,
    ...freeText,
  };

  it('scores concept coverage only', () => {
    const result = grade('scenario', {}, key, {
      text: 'I would test the lowest, the highest and an invalid value.',
    });
    expect(result.score).toBe(75);
    expect(result.isCorrect).toBe(true);
    expect(result.feedback.parts).toEqual([
      { part: 'concepts', score: 75, weight: 100 },
    ]);
  });

  it('fails below the pass score', () => {
    const result = grade('scenario', {}, key, {
      text: 'I would click around.',
    });
    expect(result).toMatchObject({ score: 0, isCorrect: false });
  });
});
