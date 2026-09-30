import {
  ANSWER_LIMITS,
  parseAnswer,
  parseAnswerKey,
  parsePrompt,
  parseSelfAssessment,
  type PromptByType,
} from './exercise-schema.js';

const single: PromptByType['multiple_choice'] = {
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  multiple: false,
};

const classification: PromptByType['classification'] = {
  categories: [
    { id: 'x', text: 'X' },
    { id: 'y', text: 'Y' },
  ],
  items: [
    { id: 'one', text: 'One' },
    { id: 'two', text: 'Two' },
  ],
};

const fields = (result: { ok: boolean; errors?: { field: string }[] }) =>
  result.ok ? [] : result.errors!.map((error) => error.field);

describe('parsePrompt', () => {
  it('accepts a multiple-choice prompt and defaults multiple to false', () => {
    const result = parsePrompt('multiple_choice', { options: single.options });
    expect(result).toEqual({ ok: true, value: single });
  });

  it('rejects too few options, bad ids and duplicate ids', () => {
    expect(
      fields(
        parsePrompt('multiple_choice', { options: [{ id: 'a', text: 'A' }] }),
      ),
    ).toContain('promptData.options');
    expect(
      fields(
        parsePrompt('multiple_choice', {
          options: [
            { id: 'A!', text: 'A' },
            { id: 'b', text: 'B' },
          ],
        }),
      ),
    ).toContain('promptData.options[0].id');
    expect(
      fields(
        parsePrompt('multiple_choice', {
          options: [
            { id: 'a', text: 'A' },
            { id: 'a', text: 'B' },
          ],
        }),
      ),
    ).toContain('promptData.options');
  });

  it('rejects unknown keys', () => {
    expect(fields(parsePrompt('scenario', { hint: 'x' }))).toEqual([
      'promptData.hint',
    ]);
    expect(parsePrompt('scenario', {})).toEqual({ ok: true, value: {} });
  });
});

describe('parseAnswerKey', () => {
  it('requires correct ids that exist, one for single choice', () => {
    expect(
      parseAnswerKey('multiple_choice', single, { correct: ['b'] }).ok,
    ).toBe(true);
    expect(
      fields(
        parseAnswerKey('multiple_choice', single, { correct: ['a', 'b'] }),
      ),
    ).toContain('answerData.correct');
    expect(
      fields(parseAnswerKey('multiple_choice', single, { correct: ['z'] })),
    ).toContain('answerData.correct');
  });

  it('requires a category for every item', () => {
    expect(
      fields(
        parseAnswerKey('classification', classification, {
          mapping: { one: 'x' },
        }),
      ),
    ).toEqual(['answerData.mapping.two']);
  });

  it('validates free-text keys: concepts, model answer, rubric', () => {
    const key = {
      expectedConcepts: [{ concept: 'Boundary', keywords: ['boundary'] }],
      modelAnswer: 'Test 17, 18, 65 and 66.',
      rubric: [{ id: 'bva', text: 'I tested both boundaries' }],
    };
    expect(parseAnswerKey('scenario', {}, key).ok).toBe(true);
    expect(
      fields(parseAnswerKey('scenario', {}, { ...key, expectedConcepts: [] })),
    ).toContain('answerData.expectedConcepts');
    expect(
      fields(
        parseAnswerKey(
          'bug_report',
          {},
          {
            ...key,
            requiredFields: ['title', 'nope'],
            expectedSeverity: 'blocker',
            expectedPriority: 'high',
          },
        ),
      ),
    ).toEqual(['answerData.requiredFields', 'answerData.expectedSeverity']);
  });
});

describe('parseAnswer', () => {
  it('multiple choice: one known option for single choice', () => {
    expect(parseAnswer('multiple_choice', single, { selected: ['a'] })).toEqual(
      {
        ok: true,
        value: { selected: ['a'] },
      },
    );
    for (const selected of [[], ['a', 'b'], ['z'], ['a', 'a']]) {
      expect(
        fields(parseAnswer('multiple_choice', single, { selected })),
      ).toContain('answer.selected');
    }
  });

  it('rejects a missing or non-object answer', () => {
    expect(fields(parseAnswer('scenario', {}, undefined))).toEqual(['answer']);
    expect(fields(parseAnswer('scenario', {}, ['text']))).toEqual(['answer']);
  });

  it('classification: every item, known categories, no extra items', () => {
    expect(
      parseAnswer('classification', classification, {
        mapping: { one: 'x', two: 'y' },
      }).ok,
    ).toBe(true);
    expect(
      fields(
        parseAnswer('classification', classification, {
          mapping: { one: 'x', two: 'z', three: 'x' },
        }),
      ),
    ).toEqual(['answer.mapping.three', 'answer.mapping.two']);
  });

  it('test case: trims text, drops empty steps, accepts missing fields', () => {
    const result = parseAnswer(
      'test_case',
      {},
      {
        title: '  Login  ',
        steps: ['Open', '  ', 'Submit'],
        priority: 'high',
      },
    );
    expect(result).toEqual({
      ok: true,
      value: {
        testCaseId: '',
        title: 'Login',
        preconditions: '',
        testData: '',
        expectedResult: '',
        steps: ['Open', 'Submit'],
        priority: 'high',
        testType: null,
      },
    });
  });

  it('test case: rejects an empty form, bad enums, long text, extra keys', () => {
    expect(fields(parseAnswer('test_case', {}, {}))).toEqual(['answer.title']);
    expect(
      fields(parseAnswer('test_case', {}, { title: 'x', testType: 'fun' })),
    ).toEqual(['answer.testType']);
    expect(
      fields(
        parseAnswer(
          'test_case',
          {},
          {
            title: 'x'.repeat(ANSWER_LIMITS.titleLength + 1),
          },
        ),
      ),
    ).toEqual(['answer.title']);
    expect(
      fields(parseAnswer('test_case', {}, { title: 'x', score: 100 })),
    ).toEqual(['answer.score']);
    expect(
      fields(
        parseAnswer(
          'test_case',
          {},
          {
            title: 'x',
            steps: Array.from({ length: ANSWER_LIMITS.steps + 1 }, () => 's'),
          },
        ),
      ),
    ).toEqual(['answer.steps']);
  });

  it('bug report: severity and priority from the fixed lists', () => {
    expect(
      parseAnswer(
        'bug_report',
        {},
        {
          title: 'Crash',
          severity: 'critical',
          priority: 'high',
          attachment: 'https://example.com/shot.png',
        },
      ).ok,
    ).toBe(true);
    expect(
      fields(
        parseAnswer('bug_report', {}, { title: 'x', severity: 'blocker' }),
      ),
    ).toEqual(['answer.severity']);
  });

  it('scenario: non-empty text within the limit', () => {
    expect(fields(parseAnswer('scenario', {}, { text: '   ' }))).toEqual([
      'answer.text',
    ]);
    expect(
      fields(
        parseAnswer(
          'scenario',
          {},
          {
            text: 'x'.repeat(ANSWER_LIMITS.scenarioLength + 1),
          },
        ),
      ),
    ).toEqual(['answer.text']);
  });
});

describe('parseSelfAssessment', () => {
  const rubric = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ];

  it('accepts distinct rubric ids, including none', () => {
    expect(parseSelfAssessment(rubric, { checked: ['b'] })).toEqual({
      ok: true,
      value: { checked: ['b'] },
    });
    expect(parseSelfAssessment(rubric, { checked: [] }).ok).toBe(true);
  });

  it('rejects unknown or repeated ids', () => {
    expect(fields(parseSelfAssessment(rubric, { checked: ['c'] }))).toEqual([
      'checked',
    ]);
    expect(
      fields(parseSelfAssessment(rubric, { checked: ['a', 'a'] })),
    ).toEqual(['checked']);
  });
});
