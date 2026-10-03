import { describe, expect, it } from 'vitest';
import type { TranslationField } from '../../types/api';
import {
  fieldLabels,
  initialTranslationValues,
  translationCounts,
  translationErrors,
  translationWrites,
} from './translation-form';

const field = (
  name: string,
  status: TranslationField['status'],
  text: string | null,
): TranslationField => ({
  field: name,
  markdown: false,
  maxLength: 160,
  source: `EN ${name}`,
  sourceHash: `hash-${name}`,
  text,
  status,
  machineText: null,
  updatedAt: null,
});

const fields = [
  field('title', 'current', 'Tiêu đề'),
  field('description', 'stale', 'Mô tả cũ'),
  field('option.a', 'missing', null),
  field('option.b', 'missing', null),
];

describe('translationWrites', () => {
  it('starts from the stored translations', () => {
    expect(initialTranslationValues(fields)).toEqual({
      title: 'Tiêu đề',
      description: 'Mô tả cũ',
      'option.a': '',
      'option.b': '',
    });
  });

  it('sends nothing when nothing changed', () => {
    expect(
      translationWrites(fields, initialTranslationValues(fields), new Set()),
    ).toEqual([]);
  });

  it('sends changed texts trimmed, and null for an emptied field', () => {
    const values = {
      ...initialTranslationValues(fields),
      title: '   ',
      'option.a': '  Lựa chọn A ',
    };
    expect(translationWrites(fields, values, new Set())).toEqual([
      { field: 'title', sourceHash: 'hash-title', text: null },
      { field: 'option.a', sourceHash: 'hash-option.a', text: 'Lựa chọn A' },
    ]);
  });

  it('resends a stale text the admin confirmed, with the new hash', () => {
    expect(
      translationWrites(
        fields,
        initialTranslationValues(fields),
        new Set(['description', 'title']),
      ),
    ).toEqual([
      {
        field: 'description',
        sourceHash: 'hash-description',
        text: 'Mô tả cũ',
      },
    ]);
  });
});

describe('translation helpers', () => {
  it('counts statuses', () => {
    expect(translationCounts(fields)).toEqual({
      current: 1,
      stale: 1,
      missing: 2,
    });
  });

  it('numbers labels in list order', () => {
    const labels = fieldLabels(fields);
    expect(labels.get('title')).toEqual({ key: 'title' });
    expect(labels.get('option.b')).toEqual({ key: 'option', number: 2 });
  });

  it('maps API details back to the sent fields', () => {
    const writes = [
      { field: 'title', sourceHash: 'h', text: 'x' },
      { field: 'option.a', sourceHash: 'h', text: 'y' },
    ];
    const { byField, other } = translationErrors(
      [
        { field: 'fields[1].text', message: 'too long' },
        { field: 'fields[0].field', message: 'unknown' },
        { field: 'fields', message: 'list' },
      ],
      writes,
    );
    expect([...byField]).toEqual([
      ['option.a', ['too long']],
      ['title', ['unknown']],
    ]);
    expect(other).toEqual(['list']);
  });
});
