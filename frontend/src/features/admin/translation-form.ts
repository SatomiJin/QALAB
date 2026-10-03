import type {
  ApiErrorDetail,
  FieldTranslationStatus,
  TranslationField,
  TranslationFieldWrite,
} from '../../types/api';

/** Typed value per field name (`title`, `option.a`…). */
export type TranslationValues = Record<string, string | undefined>;

/** What the editor starts with: the stored manual translation, stale or not. */
export function initialTranslationValues(
  fields: TranslationField[],
): TranslationValues {
  return Object.fromEntries(
    fields.map((field) => [field.field, field.text ?? '']),
  );
}

const normalise = (value: string | undefined) => {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
};

/**
 * The fields to send: those whose text changed (an emptied field removes its
 * translation), plus stale ones the admin confirmed as still right for the
 * new English (same text, current source hash).
 */
export function translationWrites(
  fields: TranslationField[],
  values: TranslationValues,
  confirmed: ReadonlySet<string>,
): TranslationFieldWrite[] {
  const writes: TranslationFieldWrite[] = [];
  for (const field of fields) {
    const text = normalise(values[field.field]);
    const changed = text !== field.text;
    const reconfirmed =
      field.status === 'stale' && text !== null && confirmed.has(field.field);
    if (!changed && !reconfirmed) continue;
    if (text === null && field.text === null) continue;
    writes.push({ field: field.field, sourceHash: field.sourceHash, text });
  }
  return writes;
}

export type TranslationCounts = Record<FieldTranslationStatus, number>;

export function translationCounts(fields: TranslationField[]) {
  const counts: TranslationCounts = { current: 0, stale: 0, missing: 0 };
  for (const field of fields) counts[field.status] += 1;
  return counts;
}

export type FieldLabelKey =
  | 'title'
  | 'description'
  | 'content_md'
  | 'question'
  | 'explanation'
  | 'model_answer'
  | 'option'
  | 'item'
  | 'category'
  | 'rubric';

/**
 * i18n key and number of a field: labels are numbered in their list order
 * (`option.b` is "Option 2"), since their ids mean nothing to an editor.
 */
export function fieldLabels(
  fields: TranslationField[],
): Map<string, { key: FieldLabelKey; number?: number }> {
  const seen = new Map<string, number>();
  const labels = new Map<string, { key: FieldLabelKey; number?: number }>();
  for (const field of fields) {
    const [kind, id] = field.field.split('.', 2);
    if (id === undefined) {
      labels.set(field.field, { key: kind as FieldLabelKey });
      continue;
    }
    const number = (seen.get(kind) ?? 0) + 1;
    seen.set(kind, number);
    labels.set(field.field, { key: kind as FieldLabelKey, number });
  }
  return labels;
}

/**
 * API details (`fields[2].text`) → messages per field name, using the writes
 * that were sent. Details that name no sent field are returned as `other`.
 */
export function translationErrors(
  details: readonly ApiErrorDetail[],
  writes: TranslationFieldWrite[],
): { byField: Map<string, string[]>; other: string[] } {
  const byField = new Map<string, string[]>();
  const other: string[] = [];
  for (const detail of details) {
    const match = /^fields\[(\d+)\]\.(?:text|field)$/.exec(detail.field);
    const write = match ? writes[Number(match[1])] : undefined;
    if (!write) {
      other.push(detail.message);
      continue;
    }
    byField.set(write.field, [
      ...(byField.get(write.field) ?? []),
      detail.message,
    ]);
  }
  return { byField, other };
}
