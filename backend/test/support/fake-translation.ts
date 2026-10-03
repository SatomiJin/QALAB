import type {
  ManualTranslationWrite,
  StoredTranslationRow,
  TranslatableEntity,
  TranslatableField,
  TranslationRow,
} from '../../src/translation/translations.repository.js';
import {
  type TranslationLanguage,
  Translator,
} from '../../src/translation/translator.js';

/**
 * Stand-in for Google Translate: prefixes every fragment with `VI: `, so a
 * translated text is easy to spot and markup inside it is untouched.
 */
export class FakeTranslator extends Translator {
  isEnabled = true;
  failing = false;
  /** Fragments sent per call. */
  readonly calls: string[][] = [];

  get enabled(): boolean {
    return this.isEnabled;
  }

  async translate(
    fragments: string[],
    _target: TranslationLanguage,
  ): Promise<string[]> {
    this.calls.push(fragments);
    if (this.failing) throw new Error('provider down');
    return fragments.map((fragment) => `VI: ${fragment}`);
  }

  reset(): void {
    this.isEnabled = true;
    this.failing = false;
    this.calls.length = 0;
  }
}

/** In-memory `TranslationsRepository`. `addManual` stands in for the seed. */
export class FakeTranslationsRepository {
  readonly rows = new Map<string, TranslationRow>();
  /** `updated_at` per row key (rows written before carry none). */
  readonly updatedAt = new Map<string, string>();
  /** Reads fail like a missing table (Postgres 42P01, a plain object). */
  failReads = false;
  /** Extra read policy (RLS), given the row and the caller's token. */
  canRead: (row: TranslationRow, token: string) => boolean = () => true;

  addManual(row: Omit<TranslationRow, 'provider' | 'pipeline_version'>): void {
    this.rows.set(
      `${row.entity_type}:${row.entity_id}:${row.field}:${row.language}:manual`,
      { ...row, provider: 'manual', pipeline_version: null },
    );
  }

  async findForEntities(
    token: string,
    entityIds: string[],
    language: TranslationLanguage,
  ): Promise<TranslationRow[]> {
    if (this.failReads) {
      throw { code: '42P01', message: 'relation does not exist' };
    }
    return [...this.rows.values()].filter(
      (row) =>
        row.language === language &&
        entityIds.includes(row.entity_id) &&
        this.canRead(row, token),
    );
  }

  /** Admin read (RLS lets admins read every row). */
  async findForEntity(
    _token: string,
    entityType: TranslatableEntity,
    entityId: string,
    language: TranslationLanguage,
  ): Promise<StoredTranslationRow[]> {
    return [...this.rows.entries()]
      .filter(
        ([, row]) =>
          row.entity_type === entityType &&
          row.entity_id === entityId &&
          row.language === language,
      )
      .map(([key, row]) => ({
        ...row,
        updated_at: this.updatedAt.get(key) ?? '2026-01-01T00:00:00.000Z',
      }));
  }

  /** Mirrors the admin policies: manual rows only (the service checked the role). */
  async saveManual(
    _token: string,
    rows: ManualTranslationWrite[],
  ): Promise<void> {
    const now = new Date().toISOString();
    for (const row of rows) {
      const key = `${row.entity_type}:${row.entity_id}:${row.field}:${row.language}:manual`;
      this.rows.set(key, {
        ...row,
        provider: 'manual',
        pipeline_version: null,
      });
      this.updatedAt.set(key, now);
    }
  }

  async removeManual(
    _token: string,
    entityType: TranslatableEntity,
    entityId: string,
    language: TranslationLanguage,
    fields: TranslatableField[],
  ): Promise<void> {
    for (const field of fields) {
      const key = `${entityType}:${entityId}:${field}:${language}:manual`;
      this.rows.delete(key);
      this.updatedAt.delete(key);
    }
  }

  async saveMachine(rows: TranslationRow[]): Promise<void> {
    for (const row of rows) {
      this.rows.set(
        `${row.entity_type}:${row.entity_id}:${row.field}:${row.language}:${row.provider}`,
        row,
      );
    }
  }
}
