import type { NamePath } from 'antd/es/form/interface';
import type {
  AnswerByType,
  ApiErrorDetail,
  BugReportAnswer,
  ExerciseType,
  Priority,
  Severity,
  TestCaseAnswer,
  TestType,
} from '../../types/api';

/**
 * Form values → request body, per type. Ant Design leaves untouched fields
 * `undefined`; the API wants strings, lists and nulls. The backend trims
 * text and drops empty steps; it is the authority on validation.
 */
export type FormValues = Record<string, unknown>;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const list = (value: unknown) =>
  Array.isArray(value)
    ? value.map(text).filter((entry) => entry.trim() !== '')
    : [];

const choice = <T extends string>(value: unknown) =>
  typeof value === 'string' && value !== '' ? (value as T) : null;

export function toAnswer(
  type: ExerciseType,
  values: FormValues,
): AnswerByType[ExerciseType] {
  switch (type) {
    case 'multiple_choice': {
      const selected = values.selected;
      return {
        selected: Array.isArray(selected)
          ? (selected as string[])
          : typeof selected === 'string'
            ? [selected]
            : [],
      };
    }
    case 'classification': {
      const mapping: Record<string, string> = {};
      for (const [item, category] of Object.entries(
        (values.mapping as Record<string, unknown> | undefined) ?? {},
      )) {
        if (typeof category === 'string') mapping[item] = category;
      }
      return { mapping };
    }
    case 'test_case':
      return {
        testCaseId: text(values.testCaseId),
        title: text(values.title),
        preconditions: text(values.preconditions),
        testData: text(values.testData),
        steps: list(values.steps),
        expectedResult: text(values.expectedResult),
        priority: choice<Priority>(values.priority),
        testType: choice<TestType>(values.testType),
      } satisfies TestCaseAnswer;
    case 'bug_report':
      return {
        bugId: text(values.bugId),
        title: text(values.title),
        environment: text(values.environment),
        preconditions: text(values.preconditions),
        stepsToReproduce: list(values.stepsToReproduce),
        actualResult: text(values.actualResult),
        expectedResult: text(values.expectedResult),
        severity: choice<Severity>(values.severity),
        priority: choice<Priority>(values.priority),
        attachment: text(values.attachment),
      } satisfies BugReportAnswer;
    case 'scenario':
      return { text: text(values.text) };
  }
}

/** A graded answer → form values, to try again from the last attempt. */
export function toFormValues(
  type: ExerciseType,
  answer: Record<string, unknown>,
  multiple = false,
): FormValues {
  if (type === 'multiple_choice') {
    const selected = (answer.selected as string[] | undefined) ?? [];
    return { selected: multiple ? selected : selected[0] };
  }
  const values: FormValues = { ...answer };
  // Keep one empty row so the steps list never renders empty.
  for (const key of ['steps', 'stepsToReproduce']) {
    if (key in values && (values[key] as unknown[]).length === 0)
      values[key] = [''];
  }
  return values;
}

/**
 * Backend `details` (`answer.title`, `answer.mapping.login`) → form field
 * errors. Details without a form field (`answer`) are returned as `other`.
 */
export function answerFieldErrors(details: ApiErrorDetail[]): {
  fields: { name: NamePath; errors: string[] }[];
  other: string[];
} {
  const byField = new Map<string, string[]>();
  const other: string[] = [];
  for (const detail of details) {
    const path = detail.field.replace(/^answer\.?/, '');
    // `steps[2]` belongs to the steps list.
    const field = path.replace(/\[\d+\]$/, '');
    if (!field) {
      other.push(detail.message);
      continue;
    }
    byField.set(field, [...(byField.get(field) ?? []), detail.message]);
  }
  return {
    fields: [...byField].map(([field, errors]) => ({
      name: field.split('.'),
      errors,
    })),
    other,
  };
}
