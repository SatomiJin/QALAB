import { sourceHash } from '../translation/source-hash.js';
import type { SourceText } from '../translation/translatable-texts.js';
import type { StoredTranslationRow } from '../translation/translations.repository.js';
import {
  describeTranslations,
  planTranslationWrites,
} from './translation-rules.js';

const texts: SourceText[] = [
  { field: 'title', text: 'Title', markdown: false, maxLength: 10 },
  {
    field: 'content_md',
    text: '# Head\n\nBody',
    markdown: true,
    maxLength: 100,
  },
  { field: 'description', text: 'Desc', markdown: false, maxLength: 100 },
];

const row = (
  field: StoredTranslationRow['field'],
  source: string,
  text: string,
  provider: 'manual' | 'google' = 'manual',
  pipeline: number | null = provider === 'manual' ? null : 1,
): StoredTranslationRow => ({
  entity_type: 'lesson',
  entity_id: 'l1',
  field,
  language: 'vi',
  source_hash: sourceHash(source),
  text,
  provider,
  pipeline_version: pipeline,
  updated_at: '2026-10-01T00:00:00.000Z',
});

describe('describeTranslations', () => {
  it('says whether each manual translation is current, stale or missing', () => {
    const result = describeTranslations(
      texts,
      [row('title', 'Title', 'Tiêu đề'), row('content_md', 'Old body', '# Cũ')],
      1,
    );
    expect(
      result.map((field) => [field.field, field.status, field.text]),
    ).toEqual([
      ['title', 'current', 'Tiêu đề'],
      ['content_md', 'stale', '# Cũ'],
      ['description', 'missing', null],
    ]);
    expect(result[0]).toMatchObject({
      source: 'Title',
      sourceHash: sourceHash('Title'),
      updatedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(result[2].updatedAt).toBeNull();
  });

  it('offers a machine translation only of the current English and pipeline', () => {
    const result = describeTranslations(
      texts,
      [
        row('title', 'Title', 'VI: Title', 'google', 1),
        row('content_md', 'Old body', 'VI: old', 'google', 1),
        row('description', 'Desc', 'VI: v0', 'google', 0),
      ],
      1,
    );
    expect(result.map((field) => field.machineText)).toEqual([
      'VI: Title',
      null,
      null,
    ]);
    expect(result.every((field) => field.status === 'missing')).toBe(true);
  });
});

describe('planTranslationWrites', () => {
  const hash = (field: string) =>
    sourceHash(texts.find((text) => text.field === field)!.text);

  it('saves texts and removes nulls', () => {
    expect(
      planTranslationWrites(texts, [
        { field: 'title', sourceHash: hash('title'), text: 'Tiêu đề' },
        { field: 'description', sourceHash: hash('description'), text: null },
      ]),
    ).toEqual({
      ok: true,
      save: [{ field: 'title', sourceHash: hash('title'), text: 'Tiêu đề' }],
      remove: ['description'],
    });
  });

  it('rejects unknown, repeated, empty, too long and mis-structured texts', () => {
    const plan = planTranslationWrites(texts, [
      { field: 'question', sourceHash: hash('title'), text: 'x' },
      { field: 'title', sourceHash: hash('title'), text: '' },
      { field: 'title', sourceHash: hash('title'), text: 'x' },
      {
        field: 'description',
        sourceHash: hash('description'),
        text: 'x'.repeat(101),
      },
      {
        field: 'content_md',
        sourceHash: hash('content_md'),
        text: 'No heading',
      },
    ]);
    expect(plan).toEqual({
      ok: false,
      conflict: false,
      errors: [
        {
          field: 'fields[0].field',
          message: 'question is not a text of this content',
        },
        {
          field: 'fields[1].text',
          message: 'text must not be empty (null removes the translation)',
        },
        { field: 'fields[2].field', message: 'field is listed twice' },
        {
          field: 'fields[3].text',
          message: 'text must be at most 100 characters',
        },
        {
          field: 'fields[4].text',
          message: 'text has 0 headings, English has 1',
        },
      ],
    });
  });

  it('is a conflict when the English changed since it was loaded', () => {
    const plan = planTranslationWrites(texts, [
      { field: 'title', sourceHash: hash('title'), text: 'Tiêu đề' },
      { field: 'description', sourceHash: sourceHash('Old'), text: 'Mô tả' },
    ]);
    expect(plan).toEqual({
      ok: false,
      conflict: true,
      errors: [
        {
          field: 'fields[1].sourceHash',
          message: 'The English text changed since it was loaded',
        },
      ],
    });
  });

  it('reports validation errors before conflicts', () => {
    const plan = planTranslationWrites(texts, [
      { field: 'description', sourceHash: sourceHash('Old'), text: 'Mô tả' },
      { field: 'nope', sourceHash: hash('title'), text: 'x' },
    ]);
    expect(plan).toMatchObject({ ok: false, conflict: false });
  });
});
