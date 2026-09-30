/**
 * Shapes of the three JSON documents behind an exercise, per type:
 *
 * * `prompt_data` (public): options, items, categories.
 * * `answer_data` (answer key, never returned): correct answers, expected
 *   concepts, model answer and self-assessment rubric.
 * * the learner's answer (request body).
 *
 * Pure functions, no Nest/Supabase. Each `parse*` validates an unknown value
 * and returns either the typed value or field errors (paths are relative to
 * the document, e.g. `selected`, `steps[2]`). Limits match the DB checks and
 * `frontend/src/types/api.ts`.
 */

export const EXERCISE_TYPES = [
  'multiple_choice',
  'classification',
  'test_case',
  'bug_report',
  'scenario',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Types graded by concept coverage; they have a model answer and rubric. */
export const FREE_TEXT_TYPES = ['test_case', 'bug_report', 'scenario'] as const;
export type FreeTextType = (typeof FREE_TEXT_TYPES)[number];

export const isFreeText = (type: ExerciseType): type is FreeTextType =>
  (FREE_TEXT_TYPES as readonly string[]).includes(type);

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SEVERITIES = ['critical', 'major', 'minor', 'trivial'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const TEST_TYPES = [
  'functional',
  'negative',
  'boundary',
  'regression',
  'smoke',
  'usability',
  'performance',
  'security',
] as const;
export type TestType = (typeof TEST_TYPES)[number];

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
export type TestCaseField = (typeof TEST_CASE_FIELDS)[number];

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
export type BugReportField = (typeof BUG_REPORT_FIELDS)[number];

/** Input limits for learner answers (DTO, DB size checks, frontend). */
export const ANSWER_LIMITS = {
  idLength: 50,
  titleLength: 200,
  textLength: 2000,
  steps: 30,
  stepLength: 500,
  scenarioLength: 5000,
  attachmentLength: 500,
} as const;

/** Id of an option, item, category or rubric entry. */
export const LABEL_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export interface Label {
  id: string;
  text: string;
}

// Prompt data (public) ------------------------------------------------------

export interface MultipleChoicePrompt {
  options: Label[];
  /** More than one option may be correct (checkboxes instead of radios). */
  multiple: boolean;
}

export interface ClassificationPrompt {
  categories: Label[];
  items: Label[];
}

/** Free-text types have no public prompt data beyond the question. */
export type EmptyPrompt = Record<string, never>;

export interface PromptByType {
  multiple_choice: MultipleChoicePrompt;
  classification: ClassificationPrompt;
  test_case: EmptyPrompt;
  bug_report: EmptyPrompt;
  scenario: EmptyPrompt;
}

// Answer keys (secret) ------------------------------------------------------

export interface Concept {
  /** Shown in feedback. QA terms, English. */
  concept: string;
  /** Any of these (word start, case and accent insensitive) counts. */
  keywords: string[];
}

interface FreeTextKey {
  expectedConcepts: Concept[];
  /** Markdown, shown after submission. */
  modelAnswer: string;
  /** Self-assessment checklist, shown after submission. */
  rubric: Label[];
}

export interface AnswerKeyByType {
  multiple_choice: { correct: string[] };
  classification: { mapping: Record<string, string> };
  test_case: FreeTextKey & { requiredFields: TestCaseField[] };
  bug_report: FreeTextKey & {
    requiredFields: BugReportField[];
    expectedSeverity: Severity;
    expectedPriority: Priority;
  };
  scenario: FreeTextKey;
}

// Learner answers -----------------------------------------------------------

export interface TestCaseAnswer {
  testCaseId: string;
  title: string;
  preconditions: string;
  testData: string;
  steps: string[];
  expectedResult: string;
  priority: Priority | null;
  testType: TestType | null;
}

export interface BugReportAnswer {
  bugId: string;
  title: string;
  environment: string;
  preconditions: string;
  stepsToReproduce: string[];
  actualResult: string;
  expectedResult: string;
  severity: Severity | null;
  priority: Priority | null;
  /** V1: a URL or a note; file upload comes later. */
  attachment: string;
}

export interface AnswerByType {
  multiple_choice: { selected: string[] };
  classification: { mapping: Record<string, string> };
  test_case: TestCaseAnswer;
  bug_report: BugReportAnswer;
  scenario: { text: string };
}

export interface SelfAssessment {
  /** Rubric ids the learner ticked. */
  checked: string[];
}

// Validation helpers --------------------------------------------------------

export interface FieldError {
  field: string;
  message: string;
}

export type Parsed<T> =
  { ok: true; value: T } | { ok: false; errors: FieldError[] };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Collects errors while reading an unknown object. */
class Reader {
  readonly errors: FieldError[] = [];

  constructor(private readonly prefix = '') {}

  path(field: string): string {
    return this.prefix ? `${this.prefix}.${field}` : field;
  }

  fail(field: string, message: string): void {
    this.errors.push({ field: this.path(field), message });
  }

  /** The value must be an object with only the given keys. */
  object(value: unknown, keys: readonly string[], field = ''): Json | null {
    if (!isObject(value)) {
      this.errors.push({
        field: field ? this.path(field) : this.prefix || 'value',
        message: 'must be an object',
      });
      return null;
    }
    for (const key of Object.keys(value)) {
      if (!keys.includes(key)) {
        const at = field ? `${field}.${key}` : key;
        this.fail(at, `${key} is not allowed`);
      }
    }
    return value;
  }

  string(
    source: Json,
    field: string,
    { max, required = false }: { max: number; required?: boolean },
  ): string {
    const value = source[field];
    if (value === undefined && !required) return '';
    if (typeof value !== 'string') {
      this.fail(field, `${field} must be a string`);
      return '';
    }
    const trimmed = value.trim();
    if (required && !trimmed) this.fail(field, `${field} must not be empty`);
    if (value.length > max) {
      this.fail(field, `${field} must be at most ${max} characters`);
    }
    return trimmed;
  }

  oneOf<T extends string>(
    source: Json,
    field: string,
    values: readonly T[],
    { nullable }: { nullable: boolean },
  ): T | null {
    const value = source[field];
    if (nullable && (value === undefined || value === null)) return null;
    if (typeof value !== 'string' || !values.includes(value as T)) {
      this.fail(field, `${field} must be one of ${values.join(', ')}`);
      return null;
    }
    return value as T;
  }

  stringList(
    source: Json,
    field: string,
    {
      maxItems,
      maxLength,
      minItems = 0,
    }: { maxItems: number; maxLength: number; minItems?: number },
  ): string[] {
    const value = source[field];
    if (value === undefined && minItems === 0) return [];
    if (!Array.isArray(value)) {
      this.fail(field, `${field} must be a list`);
      return [];
    }
    if (value.length < minItems) {
      this.fail(field, `${field} must have at least ${minItems} entries`);
    }
    if (value.length > maxItems) {
      this.fail(field, `${field} must have at most ${maxItems} entries`);
    }
    const out: string[] = [];
    value.forEach((entry, index) => {
      if (typeof entry !== 'string') {
        this.fail(`${field}[${index}]`, 'must be a string');
      } else if (entry.length > maxLength) {
        this.fail(
          `${field}[${index}]`,
          `must be at most ${maxLength} characters`,
        );
      } else {
        out.push(entry.trim());
      }
    });
    return out;
  }

  /** A list of distinct ids, each one of `allowed`. */
  ids(
    source: Json,
    field: string,
    allowed: readonly string[],
    { minItems, maxItems }: { minItems: number; maxItems: number },
  ): string[] {
    const list = this.stringList(source, field, {
      maxItems,
      maxLength: 40,
      minItems,
    });
    if (new Set(list).size !== list.length) {
      this.fail(field, `${field} must not repeat an entry`);
    }
    for (const id of list) {
      if (!allowed.includes(id))
        this.fail(field, `${field} has unknown id ${id}`);
    }
    return list;
  }

  labels(
    source: Json,
    field: string,
    { minItems, maxItems }: { minItems: number; maxItems: number },
  ): Label[] {
    const value = source[field];
    if (!Array.isArray(value)) {
      this.fail(field, `${field} must be a list`);
      return [];
    }
    if (value.length < minItems || value.length > maxItems) {
      this.fail(
        field,
        `${field} must have between ${minItems} and ${maxItems} entries`,
      );
    }
    const labels: Label[] = [];
    value.forEach((entry, index) => {
      const at = `${field}[${index}]`;
      const label = this.object(entry, ['id', 'text'], at);
      if (!label) return;
      const id = label.id;
      const text = label.text;
      if (typeof id !== 'string' || !LABEL_ID.test(id)) {
        this.fail(`${at}.id`, 'id must be lowercase a-z, 0-9, - or _');
        return;
      }
      if (typeof text !== 'string' || !text.trim() || text.length > 500) {
        this.fail(`${at}.text`, 'text must be 1-500 characters');
        return;
      }
      labels.push({ id, text: text.trim() });
    });
    if (new Set(labels.map((label) => label.id)).size !== labels.length) {
      this.fail(field, `${field} ids must be unique`);
    }
    return labels;
  }

  /** Item id → category id for every item. */
  mapping(
    source: Json,
    field: string,
    items: readonly string[],
    categories: readonly string[],
  ): Record<string, string> {
    const value = this.object(source[field], items, field);
    if (!value) return {};
    const mapping: Record<string, string> = {};
    for (const item of items) {
      const category = value[item];
      if (category === undefined) {
        this.fail(`${field}.${item}`, `${item} must be classified`);
      } else if (
        typeof category !== 'string' ||
        !categories.includes(category)
      ) {
        this.fail(`${field}.${item}`, `${item} has an unknown category`);
      } else {
        mapping[item] = category;
      }
    }
    return mapping;
  }

  result<T>(value: T): Parsed<T> {
    return this.errors.length === 0
      ? { ok: true, value }
      : { ok: false, errors: this.errors };
  }
}

// Prompt data ---------------------------------------------------------------

export function parsePrompt<T extends ExerciseType>(
  type: T,
  raw: unknown,
): Parsed<PromptByType[T]> {
  const read = new Reader('promptData');
  switch (type) {
    case 'multiple_choice': {
      const source = read.object(raw, ['options', 'multiple']);
      if (!source) break;
      const options = read.labels(source, 'options', {
        minItems: 2,
        maxItems: 8,
      });
      const multiple = source.multiple ?? false;
      if (typeof multiple !== 'boolean') {
        read.fail('multiple', 'multiple must be true or false');
      }
      return read.result({ options, multiple: multiple === true } as never);
    }
    case 'classification': {
      const source = read.object(raw, ['categories', 'items']);
      if (!source) break;
      const categories = read.labels(source, 'categories', {
        minItems: 2,
        maxItems: 6,
      });
      const items = read.labels(source, 'items', { minItems: 2, maxItems: 20 });
      return read.result({ categories, items } as never);
    }
    default: {
      read.object(raw, []);
      return read.result({} as never);
    }
  }
  return read.result({} as never);
}

// Answer keys ---------------------------------------------------------------

function readConcepts(read: Reader, source: Json, minItems: number): Concept[] {
  const value = source.expectedConcepts;
  if (value === undefined && minItems === 0) return [];
  if (!Array.isArray(value) || value.length < minItems || value.length > 20) {
    read.fail(
      'expectedConcepts',
      `expectedConcepts must be a list of ${minItems}-20 concepts`,
    );
    return [];
  }
  const concepts: Concept[] = [];
  value.forEach((entry, index) => {
    const at = `expectedConcepts[${index}]`;
    const concept = read.object(entry, ['concept', 'keywords'], at);
    if (!concept) return;
    const name = concept.concept;
    const keywords = concept.keywords;
    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
      read.fail(`${at}.concept`, 'concept must be 1-100 characters');
      return;
    }
    if (
      !Array.isArray(keywords) ||
      keywords.length === 0 ||
      keywords.length > 20 ||
      keywords.some(
        (keyword) =>
          typeof keyword !== 'string' ||
          !keyword.trim() ||
          keyword.length > 100,
      )
    ) {
      read.fail(`${at}.keywords`, 'keywords must be 1-20 non-empty strings');
      return;
    }
    concepts.push({
      concept: name.trim(),
      keywords: (keywords as string[]).map((keyword) => keyword.trim()),
    });
  });
  return concepts;
}

function readFreeTextKey(read: Reader, source: Json, minConcepts: number) {
  const expectedConcepts = readConcepts(read, source, minConcepts);
  const modelAnswer = read.string(source, 'modelAnswer', {
    max: 10000,
    required: true,
  });
  const rubric = read.labels(source, 'rubric', { minItems: 1, maxItems: 12 });
  return { expectedConcepts, modelAnswer, rubric };
}

function readRequiredFields<F extends string>(
  read: Reader,
  source: Json,
  allowed: readonly F[],
): F[] {
  return read.ids(source, 'requiredFields', allowed, {
    minItems: 0,
    maxItems: allowed.length,
  }) as F[];
}

/**
 * Validates an answer key against its type and prompt (ids must exist).
 * Used before grading and, in Phase 4, when an admin saves an exercise.
 */
export function parseAnswerKey<T extends ExerciseType>(
  type: T,
  prompt: PromptByType[T],
  raw: unknown,
): Parsed<AnswerKeyByType[T]> {
  const read = new Reader('answerData');
  switch (type) {
    case 'multiple_choice': {
      const { options, multiple } = prompt as MultipleChoicePrompt;
      const source = read.object(raw, ['correct']);
      if (!source) break;
      const correct = read.ids(
        source,
        'correct',
        options.map((option) => option.id),
        { minItems: 1, maxItems: multiple ? options.length : 1 },
      );
      return read.result({ correct } as never);
    }
    case 'classification': {
      const { items, categories } = prompt as ClassificationPrompt;
      const source = read.object(raw, ['mapping']);
      if (!source) break;
      const mapping = read.mapping(
        source,
        'mapping',
        items.map((item) => item.id),
        categories.map((category) => category.id),
      );
      return read.result({ mapping } as never);
    }
    case 'test_case': {
      const source = read.object(raw, [
        'requiredFields',
        'expectedConcepts',
        'modelAnswer',
        'rubric',
      ]);
      if (!source) break;
      const requiredFields = readRequiredFields(read, source, TEST_CASE_FIELDS);
      const rest = readFreeTextKey(read, source, 0);
      if (requiredFields.length === 0 && rest.expectedConcepts.length === 0) {
        read.fail('requiredFields', 'give required fields or concepts');
      }
      return read.result({ requiredFields, ...rest } as never);
    }
    case 'bug_report': {
      const source = read.object(raw, [
        'requiredFields',
        'expectedSeverity',
        'expectedPriority',
        'expectedConcepts',
        'modelAnswer',
        'rubric',
      ]);
      if (!source) break;
      const requiredFields = readRequiredFields(
        read,
        source,
        BUG_REPORT_FIELDS,
      );
      const expectedSeverity = read.oneOf(
        source,
        'expectedSeverity',
        SEVERITIES,
        { nullable: false },
      );
      const expectedPriority = read.oneOf(
        source,
        'expectedPriority',
        PRIORITIES,
        { nullable: false },
      );
      const rest = readFreeTextKey(read, source, 0);
      return read.result({
        requiredFields,
        expectedSeverity,
        expectedPriority,
        ...rest,
      } as never);
    }
    case 'scenario': {
      const source = read.object(raw, [
        'expectedConcepts',
        'modelAnswer',
        'rubric',
      ]);
      if (!source) break;
      return read.result(readFreeTextKey(read, source, 1) as never);
    }
  }
  return read.result({} as never);
}

// Learner answers -----------------------------------------------------------

const TEST_CASE_TEXT: Record<
  Exclude<TestCaseField, 'steps' | 'priority' | 'testType'>,
  number
> = {
  testCaseId: ANSWER_LIMITS.idLength,
  title: ANSWER_LIMITS.titleLength,
  preconditions: ANSWER_LIMITS.textLength,
  testData: ANSWER_LIMITS.textLength,
  expectedResult: ANSWER_LIMITS.textLength,
};

const BUG_REPORT_TEXT: Record<
  Exclude<BugReportField, 'stepsToReproduce' | 'severity' | 'priority'>,
  number
> = {
  bugId: ANSWER_LIMITS.idLength,
  title: ANSWER_LIMITS.titleLength,
  environment: ANSWER_LIMITS.textLength,
  preconditions: ANSWER_LIMITS.textLength,
  actualResult: ANSWER_LIMITS.textLength,
  expectedResult: ANSWER_LIMITS.textLength,
  attachment: ANSWER_LIMITS.attachmentLength,
};

function readTexts<K extends string>(
  read: Reader,
  source: Json,
  limits: Record<K, number>,
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const field of Object.keys(limits) as K[]) {
    out[field] = read.string(source, field, { max: limits[field] });
  }
  return out;
}

const steps = (read: Reader, source: Json, field: string) =>
  read
    .stringList(source, field, {
      maxItems: ANSWER_LIMITS.steps,
      maxLength: ANSWER_LIMITS.stepLength,
    })
    .filter((step) => step !== '');

/**
 * Validates and normalises a learner's answer (strings trimmed, empty steps
 * dropped). Structured forms may be incomplete — missing fields lower the
 * score — but not empty.
 */
export function parseAnswer<T extends ExerciseType>(
  type: T,
  prompt: PromptByType[T],
  raw: unknown,
): Parsed<AnswerByType[T]> {
  const read = new Reader('answer');
  switch (type) {
    case 'multiple_choice': {
      const { options, multiple } = prompt as MultipleChoicePrompt;
      const source = read.object(raw, ['selected']);
      if (!source) break;
      const selected = read.ids(
        source,
        'selected',
        options.map((option) => option.id),
        { minItems: 1, maxItems: multiple ? options.length : 1 },
      );
      return read.result({ selected } as never);
    }
    case 'classification': {
      const { items, categories } = prompt as ClassificationPrompt;
      const source = read.object(raw, ['mapping']);
      if (!source) break;
      const mapping = read.mapping(
        source,
        'mapping',
        items.map((item) => item.id),
        categories.map((category) => category.id),
      );
      return read.result({ mapping } as never);
    }
    case 'test_case': {
      const source = read.object(raw, TEST_CASE_FIELDS);
      if (!source) break;
      const answer: TestCaseAnswer = {
        ...readTexts(read, source, TEST_CASE_TEXT),
        steps: steps(read, source, 'steps'),
        priority: read.oneOf(source, 'priority', PRIORITIES, {
          nullable: true,
        }),
        testType: read.oneOf(source, 'testType', TEST_TYPES, {
          nullable: true,
        }),
      };
      if (read.errors.length === 0 && isBlank(answer)) {
        read.fail('title', 'Fill in at least one field');
      }
      return read.result(answer as never);
    }
    case 'bug_report': {
      const source = read.object(raw, BUG_REPORT_FIELDS);
      if (!source) break;
      const answer: BugReportAnswer = {
        ...readTexts(read, source, BUG_REPORT_TEXT),
        stepsToReproduce: steps(read, source, 'stepsToReproduce'),
        severity: read.oneOf(source, 'severity', SEVERITIES, {
          nullable: true,
        }),
        priority: read.oneOf(source, 'priority', PRIORITIES, {
          nullable: true,
        }),
      };
      if (read.errors.length === 0 && isBlank(answer)) {
        read.fail('title', 'Fill in at least one field');
      }
      return read.result(answer as never);
    }
    case 'scenario': {
      const source = read.object(raw, ['text']);
      if (!source) break;
      const text = read.string(source, 'text', {
        max: ANSWER_LIMITS.scenarioLength,
        required: true,
      });
      return read.result({ text } as never);
    }
  }
  return read.result({} as never);
}

/** True when every field of a structured answer is empty. */
function isBlank(answer: object): boolean {
  return Object.values(answer).every(
    (value) =>
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0),
  );
}

/** Validates a self-assessment against the exercise's rubric. */
export function parseSelfAssessment(
  rubric: Label[],
  raw: unknown,
): Parsed<SelfAssessment> {
  const read = new Reader();
  const source = read.object(raw, ['checked']);
  if (!source) return read.result({ checked: [] });
  const checked = read.ids(
    source,
    'checked',
    rubric.map((entry) => entry.id),
    { minItems: 0, maxItems: rubric.length },
  );
  return read.result({ checked });
}
