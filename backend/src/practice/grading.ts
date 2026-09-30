import type {
  AnswerByType,
  AnswerKeyByType,
  BugReportField,
  Concept,
  ExerciseType,
  Priority,
  PromptByType,
  Severity,
  TestCaseField,
} from './exercise-schema.js';

/**
 * Deterministic grading (no AI in V1). Pure functions: the answer key comes
 * in, a score, verdict and feedback come out. Feedback holds ids and English
 * concept names only; the frontend labels them.
 *
 * * `multiple_choice`: exact match of the selected set → 100 or 0.
 * * `classification`: % of items in the right category; correct = all right.
 * * `test_case`: required fields present (40 %) + concept coverage (60 %).
 * * `bug_report`: required fields (30 %) + severity (20 %) + priority (20 %)
 *   + concept coverage (30 %).
 * * `scenario`: concept coverage (100 %).
 *
 * Free-text types pass at `PASS_SCORE`. A part without anything to check
 * (no required fields, no concepts) is left out and the others reweighted.
 */

export const PASS_SCORE = 70;

export interface ConceptResult {
  concept: string;
  matched: boolean;
}

export interface FieldResult<F extends string> {
  field: F;
  present: boolean;
}

export interface MatchResult<T extends string> {
  expected: T;
  given: T | null;
  match: boolean;
}

export type ScorePartName = 'fields' | 'concepts' | 'severity' | 'priority';

export interface ScorePart {
  part: ScorePartName;
  /** 0-100 for this part. */
  score: number;
  /** Share of the total, in %, after reweighting. */
  weight: number;
}

export interface FeedbackByType {
  multiple_choice: {
    type: 'multiple_choice';
    options: { id: string; selected: boolean; correct: boolean }[];
  };
  classification: {
    type: 'classification';
    items: {
      id: string;
      chosen: string;
      correct: string;
      isCorrect: boolean;
    }[];
    correctCount: number;
    total: number;
  };
  test_case: {
    type: 'test_case';
    parts: ScorePart[];
    fields: FieldResult<TestCaseField>[];
    concepts: ConceptResult[];
  };
  bug_report: {
    type: 'bug_report';
    parts: ScorePart[];
    fields: FieldResult<BugReportField>[];
    severity: MatchResult<Severity>;
    priority: MatchResult<Priority>;
    concepts: ConceptResult[];
  };
  scenario: {
    type: 'scenario';
    parts: ScorePart[];
    concepts: ConceptResult[];
  };
}

export type Feedback = FeedbackByType[ExerciseType];

export interface Grade<T extends ExerciseType = ExerciseType> {
  score: number;
  isCorrect: boolean;
  feedback: FeedbackByType[T];
}

// Text matching -------------------------------------------------------------

/** Lower case, accents removed (so Vietnamese keywords match without tones). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A keyword matches at the start of a word: `boundar` finds "boundary" and
 * "boundaries"; `min` also finds "minute" (known limitation of keyword
 * matching). Spaces in a keyword match any whitespace.
 */
export function containsKeyword(
  normalizedText: string,
  keyword: string,
): boolean {
  const pattern = normalizeText(keyword)
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join('\\s+');
  if (!pattern) return false;
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}`, 'u').test(
    normalizedText,
  );
}

export function matchConcepts(
  texts: string[],
  concepts: Concept[],
): ConceptResult[] {
  const haystack = normalizeText(texts.join('\n'));
  return concepts.map(({ concept, keywords }) => ({
    concept,
    matched: keywords.some((keyword) => containsKeyword(haystack, keyword)),
  }));
}

// Scoring helpers -----------------------------------------------------------

const percent = (part: number, whole: number) =>
  whole === 0 ? 100 : Math.round((part / whole) * 100);

/** Weighted average of the parts that apply; weights are rescaled to 100. */
function combine(
  parts: {
    part: ScorePartName;
    score: number;
    weight: number;
    applies: boolean;
  }[],
): { score: number; parts: ScorePart[] } {
  const active = parts.filter((part) => part.applies);
  const totalWeight = active.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight === 0) return { score: 100, parts: [] };
  const score = Math.round(
    active.reduce((sum, part) => sum + part.score * part.weight, 0) /
      totalWeight,
  );
  return {
    score,
    parts: active.map(({ part, score: partScore, weight }) => ({
      part,
      score: partScore,
      weight: Math.round((weight / totalWeight) * 100),
    })),
  };
}

const isPresent = (value: unknown) =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== undefined && value !== '';

function checkFields<F extends string>(
  answer: object,
  required: F[],
): FieldResult<F>[] {
  const values = answer as Record<string, unknown>;
  return required.map((field) => ({
    field,
    present: isPresent(values[field]),
  }));
}

const countTrue = <T>(list: T[], pick: (entry: T) => boolean) =>
  list.filter(pick).length;

// Per type ------------------------------------------------------------------

function gradeMultipleChoice(
  prompt: PromptByType['multiple_choice'],
  key: AnswerKeyByType['multiple_choice'],
  answer: AnswerByType['multiple_choice'],
): Grade<'multiple_choice'> {
  const selected = new Set(answer.selected);
  const correct = new Set(key.correct);
  const options = prompt.options.map(({ id }) => ({
    id,
    selected: selected.has(id),
    correct: correct.has(id),
  }));
  const isCorrect = options.every(
    (option) => option.selected === option.correct,
  );
  return {
    score: isCorrect ? 100 : 0,
    isCorrect,
    feedback: { type: 'multiple_choice', options },
  };
}

function gradeClassification(
  prompt: PromptByType['classification'],
  key: AnswerKeyByType['classification'],
  answer: AnswerByType['classification'],
): Grade<'classification'> {
  const items = prompt.items.map(({ id }) => {
    const chosen = answer.mapping[id];
    const correct = key.mapping[id];
    return { id, chosen, correct, isCorrect: chosen === correct };
  });
  const correctCount = countTrue(items, (item) => item.isCorrect);
  return {
    score: percent(correctCount, items.length),
    isCorrect: correctCount === items.length,
    feedback: {
      type: 'classification',
      items,
      correctCount,
      total: items.length,
    },
  };
}

function gradeTestCase(
  key: AnswerKeyByType['test_case'],
  answer: AnswerByType['test_case'],
): Grade<'test_case'> {
  const fields = checkFields(answer, key.requiredFields);
  const concepts = matchConcepts(
    [
      answer.title,
      answer.preconditions,
      answer.testData,
      ...answer.steps,
      answer.expectedResult,
    ],
    key.expectedConcepts,
  );
  const { score, parts } = combine([
    {
      part: 'fields',
      score: percent(
        countTrue(fields, (f) => f.present),
        fields.length,
      ),
      weight: 40,
      applies: fields.length > 0,
    },
    {
      part: 'concepts',
      score: percent(
        countTrue(concepts, (c) => c.matched),
        concepts.length,
      ),
      weight: 60,
      applies: concepts.length > 0,
    },
  ]);
  return {
    score,
    isCorrect: score >= PASS_SCORE,
    feedback: { type: 'test_case', parts, fields, concepts },
  };
}

function gradeBugReport(
  key: AnswerKeyByType['bug_report'],
  answer: AnswerByType['bug_report'],
): Grade<'bug_report'> {
  const fields = checkFields(answer, key.requiredFields);
  const concepts = matchConcepts(
    [
      answer.title,
      answer.environment,
      answer.preconditions,
      ...answer.stepsToReproduce,
      answer.actualResult,
      answer.expectedResult,
    ],
    key.expectedConcepts,
  );
  const severity = {
    expected: key.expectedSeverity,
    given: answer.severity,
    match: answer.severity === key.expectedSeverity,
  };
  const priority = {
    expected: key.expectedPriority,
    given: answer.priority,
    match: answer.priority === key.expectedPriority,
  };
  const { score, parts } = combine([
    {
      part: 'fields',
      score: percent(
        countTrue(fields, (f) => f.present),
        fields.length,
      ),
      weight: 30,
      applies: fields.length > 0,
    },
    {
      part: 'severity',
      score: severity.match ? 100 : 0,
      weight: 20,
      applies: true,
    },
    {
      part: 'priority',
      score: priority.match ? 100 : 0,
      weight: 20,
      applies: true,
    },
    {
      part: 'concepts',
      score: percent(
        countTrue(concepts, (c) => c.matched),
        concepts.length,
      ),
      weight: 30,
      applies: concepts.length > 0,
    },
  ]);
  return {
    score,
    isCorrect: score >= PASS_SCORE,
    feedback: {
      type: 'bug_report',
      parts,
      fields,
      severity,
      priority,
      concepts,
    },
  };
}

function gradeScenario(
  key: AnswerKeyByType['scenario'],
  answer: AnswerByType['scenario'],
): Grade<'scenario'> {
  const concepts = matchConcepts([answer.text], key.expectedConcepts);
  const { score, parts } = combine([
    {
      part: 'concepts',
      score: percent(
        countTrue(concepts, (c) => c.matched),
        concepts.length,
      ),
      weight: 100,
      applies: concepts.length > 0,
    },
  ]);
  return {
    score,
    isCorrect: score >= PASS_SCORE,
    feedback: { type: 'scenario', parts, concepts },
  };
}

/** Grades a validated answer against a validated key. */
export function grade<T extends ExerciseType>(
  type: T,
  prompt: PromptByType[T],
  key: AnswerKeyByType[T],
  answer: AnswerByType[T],
): Grade<T> {
  // Each branch narrows `T` by hand: TypeScript cannot relate the generic
  // maps to the literal `type`, hence the casts.
  switch (type as ExerciseType) {
    case 'multiple_choice':
      return gradeMultipleChoice(
        prompt as PromptByType['multiple_choice'],
        key as AnswerKeyByType['multiple_choice'],
        answer as AnswerByType['multiple_choice'],
      ) as Grade<T>;
    case 'classification':
      return gradeClassification(
        prompt as PromptByType['classification'],
        key as AnswerKeyByType['classification'],
        answer as AnswerByType['classification'],
      ) as Grade<T>;
    case 'test_case':
      return gradeTestCase(
        key as AnswerKeyByType['test_case'],
        answer as AnswerByType['test_case'],
      ) as Grade<T>;
    case 'bug_report':
      return gradeBugReport(
        key as AnswerKeyByType['bug_report'],
        answer as AnswerByType['bug_report'],
      ) as Grade<T>;
    case 'scenario':
      return gradeScenario(
        key as AnswerKeyByType['scenario'],
        answer as AnswerByType['scenario'],
      ) as Grade<T>;
  }
}
