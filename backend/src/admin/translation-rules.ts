import type { FieldError } from '../practice/exercise-schema.js';
import { sourceHash } from '../translation/source-hash.js';
import {
  markdownParityErrors,
  type SourceText,
} from '../translation/translatable-texts.js';
import type {
  StoredTranslationRow,
  TranslatableField,
} from '../translation/translations.repository.js';

export const FIELD_TRANSLATION_STATUSES = [
  'current',
  'stale',
  'missing',
] as const;
export type FieldTranslationStatus =
  (typeof FIELD_TRANSLATION_STATUSES)[number];

export interface FieldTranslation {
  field: TranslatableField;
  markdown: boolean;
  maxLength: number;
  source: string;
  sourceHash: string;
  text: string | null;
  status: FieldTranslationStatus;
  machineText: string | null;
  updatedAt: string | null;
}

/**
 * Each English text with its manual translation and whether that was written
 * for this English (`current`), an older one (`stale`: learners see English
 * until someone retranslates) or is missing. A machine translation of this
 * exact English, made by the current pipeline, is offered as a draft.
 */
export function describeTranslations(
  texts: SourceText[],
  rows: StoredTranslationRow[],
  pipelineVersion: number,
): FieldTranslation[] {
  return texts.map((text) => {
    const hash = sourceHash(text.text);
    const mine = rows.filter((row) => row.field === text.field);
    const manual = mine.find((row) => row.provider === 'manual');
    const machine = mine.find(
      (row) =>
        row.provider !== 'manual' &&
        row.source_hash === hash &&
        row.pipeline_version === pipelineVersion,
    );
    let status: FieldTranslationStatus = 'missing';
    if (manual) status = manual.source_hash === hash ? 'current' : 'stale';
    return {
      field: text.field,
      markdown: text.markdown,
      maxLength: text.maxLength,
      source: text.text,
      sourceHash: hash,
      text: manual?.text ?? null,
      status,
      machineText: machine?.text ?? null,
      updatedAt: manual?.updated_at ?? null,
    };
  });
}

export interface TranslationWrite {
  field: string;
  sourceHash: string;
  /** Trimmed. Null removes the manual translation. */
  text: string | null;
}

export type TranslationPlan =
  | {
      ok: true;
      save: { field: TranslatableField; sourceHash: string; text: string }[];
      remove: TranslatableField[];
    }
  /** `conflict`: the English changed since the editor loaded it (409). */
  | { ok: false; conflict: boolean; errors: FieldError[] };

/**
 * Checks a save against the current English: every field exists on the row
 * and is listed once, was translated from the current English, fits the
 * field's limit and keeps the Markdown structure. Nothing is written unless
 * every field passes. Errors use the request paths (`fields[1].text`).
 */
export function planTranslationWrites(
  texts: SourceText[],
  writes: TranslationWrite[],
): TranslationPlan {
  const byField = new Map(texts.map((text) => [text.field as string, text]));
  const errors: FieldError[] = [];
  const conflicts: FieldError[] = [];
  const seen = new Set<string>();
  const save: { field: TranslatableField; sourceHash: string; text: string }[] =
    [];
  const remove: TranslatableField[] = [];

  writes.forEach((write, index) => {
    const at = `fields[${index}]`;
    const source = byField.get(write.field);
    if (!source) {
      errors.push({
        field: `${at}.field`,
        message: `${write.field} is not a text of this content`,
      });
      return;
    }
    if (seen.has(write.field)) {
      errors.push({ field: `${at}.field`, message: 'field is listed twice' });
      return;
    }
    seen.add(write.field);
    const hash = sourceHash(source.text);
    if (write.sourceHash !== hash) {
      conflicts.push({
        field: `${at}.sourceHash`,
        message: 'The English text changed since it was loaded',
      });
      return;
    }
    if (write.text === null) {
      remove.push(source.field);
      return;
    }
    if (!write.text) {
      errors.push({
        field: `${at}.text`,
        message: 'text must not be empty (null removes the translation)',
      });
      return;
    }
    if (write.text.length > source.maxLength) {
      errors.push({
        field: `${at}.text`,
        message: `text must be at most ${source.maxLength} characters`,
      });
      return;
    }
    if (source.markdown) {
      const parity = markdownParityErrors(source.text, write.text);
      if (parity.length > 0) {
        errors.push(
          ...parity.map((message) => ({
            field: `${at}.text`,
            message: `text ${message}`,
          })),
        );
        return;
      }
    }
    save.push({ field: source.field, sourceHash: hash, text: write.text });
  });

  if (errors.length > 0) return { ok: false, conflict: false, errors };
  if (conflicts.length > 0) {
    return { ok: false, conflict: true, errors: conflicts };
  }
  return { ok: true, save, remove };
}
