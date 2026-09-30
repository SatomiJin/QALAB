import { ApiError } from '../../lib/api';
import type {
  AdminExercise,
  AnswerData,
  ContentStatus,
  Difficulty,
  ExerciseType,
  Label,
  Priority,
  PromptData,
  Severity,
} from '../../types/api';

/**
 * The exercise editor's form values, one shape for every type (only the
 * fields of the chosen type are sent). Label ids are generated, never typed:
 * they only have to be stable once learners have answered.
 */
export interface ExerciseFormValues {
  question: string;
  difficulty: Difficulty;
  status: ContentStatus;
  explanation: string;
  // multiple_choice
  options: { id: string; text: string; correct: boolean }[];
  multiple: boolean;
  // classification
  categories: { id: string; text: string }[];
  items: { id: string; text: string; category?: string }[];
  // free-text types
  requiredFields: string[];
  expectedSeverity?: Severity;
  expectedPriority?: Priority;
  concepts: { concept: string; keywords: string }[];
  modelAnswer: string;
  rubric: { id: string; text: string }[];
}

export const TEST_CASE_FIELDS = [
  'testCaseId',
  'title',
  'preconditions',
  'testData',
  'steps',
  'expectedResult',
  'priority',
  'testType',
] as const;

export const BUG_REPORT_FIELDS = [
  'bugId',
  'title',
  'environment',
  'preconditions',
  'stepsToReproduce',
  'actualResult',
  'expectedResult',
  'severity',
  'priority',
  'attachment',
] as const;

export function emptyExerciseValues(type: ExerciseType): ExerciseFormValues {
  return {
    question: '',
    difficulty: 'easy',
    status: 'draft',
    explanation: '',
    options: [
      { id: 'a', text: '', correct: false },
      { id: 'b', text: '', correct: false },
    ],
    multiple: false,
    categories: [
      { id: 'category-1', text: '' },
      { id: 'category-2', text: '' },
    ],
    items: [
      { id: 'item-1', text: '' },
      { id: 'item-2', text: '' },
    ],
    requiredFields: [],
    concepts: type === 'scenario' ? [{ concept: '', keywords: '' }] : [],
    modelAnswer: '',
    rubric: [{ id: 'rubric-1', text: '' }],
  };
}

export type LabelPrefix = 'option' | 'category' | 'item' | 'rubric';

/**
 * Id for a new label, unused in the list: `a`, `b`, … for options (as in
 * the seed), `<prefix>-<n>` otherwise.
 */
export function nextLabelId(
  list: readonly { id?: string }[],
  prefix: LabelPrefix,
): string {
  const used = new Set(list.map((entry) => entry.id));
  for (let n = 0; ; n += 1) {
    const id =
      prefix === 'option' && n < 26
        ? String.fromCharCode(97 + n)
        : `${prefix}-${n + 1}`;
    if (!used.has(id)) return id;
  }
}

const label = ({ id, text }: { id: string; text: string }): Label => ({
  id,
  text: text.trim(),
});

const keywordsOf = (value: string) =>
  value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

/** Form values → the `promptData` and `answerData` the API expects. */
export function toExercisePayload(
  type: ExerciseType,
  values: ExerciseFormValues,
): { promptData: PromptData; answerData: AnswerData } {
  if (type === 'multiple_choice') {
    const options = values.options;
    return {
      promptData: { options: options.map(label), multiple: values.multiple },
      answerData: {
        correct: options.filter((o) => o.correct).map((o) => o.id),
      },
    };
  }
  if (type === 'classification') {
    const { categories, items } = values;
    const mapping: Record<string, string> = {};
    for (const item of items) {
      if (item.category) mapping[item.id] = item.category;
    }
    return {
      promptData: {
        categories: categories.map(label),
        items: items.map(label),
      },
      answerData: { mapping },
    };
  }
  const freeText: AnswerData = {
    expectedConcepts: values.concepts
      .filter((c) => c.concept.trim() || c.keywords.trim())
      .map((c) => ({
        concept: c.concept.trim(),
        keywords: keywordsOf(c.keywords),
      })),
    modelAnswer: values.modelAnswer,
    rubric: values.rubric.map(label),
  };
  if (type === 'test_case') {
    return {
      promptData: {},
      answerData: { requiredFields: values.requiredFields, ...freeText },
    };
  }
  if (type === 'bug_report') {
    return {
      promptData: {},
      answerData: {
        requiredFields: values.requiredFields,
        expectedSeverity: values.expectedSeverity,
        expectedPriority: values.expectedPriority,
        ...freeText,
      },
    };
  }
  return { promptData: {}, answerData: freeText };
}

/** A stored exercise → form values (ids kept, so they stay stable). */
export function toExerciseValues(exercise: AdminExercise): ExerciseFormValues {
  const base = emptyExerciseValues(exercise.type);
  const prompt = exercise.promptData;
  const key = exercise.answerData ?? {};
  const correct = new Set(key.correct ?? []);
  return {
    ...base,
    question: exercise.question,
    difficulty: exercise.difficulty,
    status: exercise.status,
    explanation: exercise.explanation,
    options: (prompt.options ?? base.options).map((option) => ({
      id: option.id,
      text: option.text,
      correct: correct.has(option.id),
    })),
    multiple: prompt.multiple ?? false,
    categories: prompt.categories ?? base.categories,
    items: (prompt.items ?? base.items).map((item) => ({
      id: item.id,
      text: item.text,
      category: key.mapping?.[item.id],
    })),
    requiredFields: key.requiredFields ?? [],
    expectedSeverity: key.expectedSeverity,
    expectedPriority: key.expectedPriority,
    concepts: (key.expectedConcepts ?? []).map((c) => ({
      concept: c.concept,
      keywords: c.keywords.join(', '),
    })),
    modelAnswer: key.modelAnswer ?? '',
    rubric: key.rubric ?? base.rubric,
  };
}

type FieldPath = (string | number)[];

/**
 * Where a backend error path (`promptData.options[1].text`,
 * `answerData.mapping.login`, `answerData.expectedConcepts[0].keywords`)
 * belongs in the form. Null for errors about a whole list, shown in the
 * form's alert instead.
 */
export function formFieldOf(
  path: string,
  values: ExerciseFormValues,
): FieldPath | null {
  if (['question', 'explanation', 'difficulty', 'status'].includes(path)) {
    return [path];
  }
  let match = /^promptData\.(options|categories|items)\[(\d+)\]/.exec(path);
  if (match) return [match[1]!, Number(match[2]), 'text'];
  match = /^answerData\.rubric\[(\d+)\]/.exec(path);
  if (match) return ['rubric', Number(match[1]), 'text'];
  match = /^answerData\.expectedConcepts\[(\d+)\]\.(concept|keywords)$/.exec(
    path,
  );
  if (match) return ['concepts', Number(match[1]), match[2]!];
  match = /^answerData\.mapping\.(.+)$/.exec(path);
  if (match) {
    const index = values.items.findIndex((item) => item.id === match![1]);
    return index >= 0 ? ['items', index, 'category'] : null;
  }
  match =
    /^answerData\.(modelAnswer|expectedSeverity|expectedPriority|requiredFields)$/.exec(
      path,
    );
  if (match) return [match[1]!];
  return null;
}

/** Splits a 400's details into form field errors and the rest. */
export function exerciseFieldErrors(
  error: unknown,
  values: ExerciseFormValues,
): { fields: { name: FieldPath; errors: string[] }[]; other: string[] } {
  const fields: { name: FieldPath; errors: string[] }[] = [];
  const other: string[] = [];
  if (!(error instanceof ApiError) || error.status !== 400) {
    return { fields, other };
  }
  for (const detail of error.details) {
    const name = formFieldOf(detail.field, values);
    if (name) fields.push({ name, errors: [detail.message] });
    else other.push(detail.message);
  }
  return { fields, other };
}
