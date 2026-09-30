import type { TranslationRow } from '../../src/translation/translations.repository.js';
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
  /** Reads fail like a missing table (Postgres 42P01, a plain object). */
  failReads = false;

  addManual(row: Omit<TranslationRow, 'provider' | 'pipeline_version'>): void {
    this.rows.set(
      `${row.entity_type}:${row.entity_id}:${row.field}:${row.language}:manual`,
      { ...row, provider: 'manual', pipeline_version: null },
    );
  }

  async findForEntities(
    _token: string,
    entityIds: string[],
    language: TranslationLanguage,
  ): Promise<TranslationRow[]> {
    if (this.failReads) {
      throw { code: '42P01', message: 'relation does not exist' };
    }
    return [...this.rows.values()].filter(
      (row) => row.language === language && entityIds.includes(row.entity_id),
    );
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
