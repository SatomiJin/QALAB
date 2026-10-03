import type {
  TranslatableEntity,
  TranslatableField,
} from './translations.repository.js';

/** One English text of a content row that can be translated. */
export interface SourceText {
  field: TranslatableField;
  text: string;
  /** Translated as a Markdown document (structure must be kept). */
  markdown: boolean;
  /** Same limit as the English field. */
  maxLength: number;
}

/**
 * Limits of the English fields (DTO, DB checks, exercise schema): a
 * translation may be as long as its source field allows.
 */
export const TEXT_LIMITS = {
  title: 160,
  description: 2000,
  content: 100_000,
  question: 2000,
  explanation: 10_000,
  modelAnswer: 10_000,
  label: 500,
} as const;

type Labels = { id: string; text: string }[];

const labelsOf = (source: unknown, key: string): Labels => {
  if (!source || typeof source !== 'object') return [];
  const value = (source as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as Labels) : [];
};

/** Texts that are empty in English have nothing to translate. */
const present = (texts: SourceText[]) =>
  texts.filter((text) => typeof text.text === 'string' && text.text.trim());

const plain = (
  field: TranslatableField,
  text: string,
  maxLength: number,
): SourceText => ({ field, text, markdown: false, maxLength });

const markdown = (
  field: TranslatableField,
  text: string,
  maxLength: number,
): SourceText => ({ field, text, markdown: true, maxLength });

const labelTexts = (
  kind: 'option' | 'item' | 'category' | 'rubric',
  labels: Labels,
): SourceText[] =>
  labels.map((label) =>
    plain(`${kind}.${label.id}`, label.text, TEXT_LIMITS.label),
  );

export interface ContentTextsInput {
  course: { title: string; description: string };
  module: { title: string; description: string };
  lesson: { title: string; content_md: string };
  exercise: {
    question: string;
    prompt_data: unknown;
    /** The answer key row; review texts are left out without one. */
    answer: { explanation: string; answer_data: unknown } | null;
  };
}

/**
 * The translatable English texts of a content row, in reading order. Field
 * names match what learner endpoints translate (`content_translations.field`).
 */
export function contentTexts<K extends TranslatableEntity>(
  kind: K,
  row: ContentTextsInput[K],
): SourceText[] {
  switch (kind) {
    case 'course':
    case 'module': {
      const r = row as ContentTextsInput['course'];
      return present([
        plain('title', r.title, TEXT_LIMITS.title),
        plain('description', r.description, TEXT_LIMITS.description),
      ]);
    }
    case 'lesson': {
      const r = row as ContentTextsInput['lesson'];
      return present([
        plain('title', r.title, TEXT_LIMITS.title),
        markdown('content_md', r.content_md, TEXT_LIMITS.content),
      ]);
    }
    default: {
      const r = row as ContentTextsInput['exercise'];
      const key = r.answer?.answer_data as { modelAnswer?: string } | undefined;
      return present([
        markdown('question', r.question, TEXT_LIMITS.question),
        ...labelTexts('option', labelsOf(r.prompt_data, 'options')),
        ...labelTexts('category', labelsOf(r.prompt_data, 'categories')),
        ...labelTexts('item', labelsOf(r.prompt_data, 'items')),
        markdown(
          'explanation',
          r.answer?.explanation ?? '',
          TEXT_LIMITS.explanation,
        ),
        markdown(
          'model_answer',
          key?.modelAnswer ?? '',
          TEXT_LIMITS.modelAnswer,
        ),
        ...labelTexts('rubric', labelsOf(r.answer?.answer_data, 'rubric')),
      ]);
    }
  }
}

// Markdown structure ----------------------------------------------------------

const headings = (md: string) =>
  md.split('\n').filter((line) => /^#{1,6}\s/.test(line)).length;
const fences = (md: string) =>
  md.split('\n').filter((line) => /^\s*(```|~~~)/.test(line)).length;

/**
 * A translated Markdown document keeps the English structure: the same
 * number of headings and code fences. Empty when it does.
 */
export function markdownParityErrors(english: string, translated: string) {
  const errors: string[] = [];
  if (headings(english) !== headings(translated)) {
    errors.push(
      `has ${headings(translated)} headings, English has ${headings(english)}`,
    );
  }
  if (fences(english) !== fences(translated)) {
    errors.push('must have the same code blocks as English');
  }
  return errors;
}
