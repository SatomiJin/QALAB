import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthUser } from '../auth/auth-user.js';
import { describeError } from '../common/errors/describe-error.js';
import {
  PIPELINE_VERSION,
  prepareInline,
  prepareMarkdown,
  type PreparedText,
} from './markdown-translate.js';
import {
  MARKDOWN_FIELDS,
  type TranslatableEntity,
  type TranslatableField,
  type TranslationRow,
  TranslationsRepository,
} from './translations.repository.js';
import { type TranslationLanguage, Translator } from './translator.js';

export const CONTENT_LANGUAGES = ['en', 'vi'] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

/**
 * `none`: English was asked for. `manual`: every text has a translation
 * written by a person. `machine`: every text is translated, at least one by
 * machine. `unavailable`: some or all texts are still English (no manual
 * translation and no provider configured, or the provider failed).
 */
export const TRANSLATION_STATUSES = [
  'none',
  'manual',
  'machine',
  'unavailable',
] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

/** One source text to translate. */
export interface TextRef {
  type: TranslatableEntity;
  id: string;
  field: TranslatableField;
  text: string;
}

export interface Translations {
  status: TranslationStatus;
  /** The translated text, or the source when there is none. */
  get(ref: TextRef): string;
}

const key = (ref: Pick<TextRef, 'type' | 'id' | 'field'>) =>
  `${ref.type}:${ref.id}:${ref.field}`;

const rowKey = (row: TranslationRow) =>
  `${row.entity_type}:${row.entity_id}:${row.field}`;

/**
 * Ties a translation to the exact English source: sha-256 of its UTF-8 text,
 * hex. The seed computes the same value in SQL for manual translations.
 */
export function sourceHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const IDENTITY: Translations = {
  status: 'none',
  get: (ref) => ref.text,
};

/**
 * Serves learning content in another language. Per text, in order:
 *
 * 1. a manual translation (written by a person) of this exact source;
 * 2. a cached machine translation of this exact source, made by the current
 *    pipeline;
 * 3. a fresh machine translation, when a provider is configured (cached);
 * 4. the English source.
 *
 * Failure never fails the request: the English text is returned and the
 * status says so.
 */
@Injectable()
export class ContentTranslationService {
  private readonly logger = new Logger(ContentTranslationService.name);

  constructor(
    private readonly translator: Translator,
    private readonly repository: TranslationsRepository,
  ) {}

  async translate(
    user: AuthUser,
    refs: TextRef[],
    language: ContentLanguage,
  ): Promise<Translations> {
    if (language === 'en') return IDENTITY;

    const unique = new Map<string, TextRef>();
    for (const ref of refs) if (ref.text.trim()) unique.set(key(ref), ref);
    if (unique.size === 0) return { ...IDENTITY, status: 'manual' };

    const done = new Map<string, string>();
    let usedMachine = false;

    const rows = await this.readCache(
      user,
      [...new Set([...unique.values()].map((ref) => ref.id))],
      language,
    );
    const valid = rows.filter((row) => {
      const ref = unique.get(rowKey(row));
      return (
        ref !== undefined &&
        row.source_hash === sourceHash(ref.text) &&
        (row.provider === 'manual' || row.pipeline_version === PIPELINE_VERSION)
      );
    });
    for (const row of valid.filter((r) => r.provider === 'manual')) {
      done.set(rowKey(row), row.text);
    }
    for (const row of valid.filter((r) => r.provider !== 'manual')) {
      if (done.has(rowKey(row))) continue;
      done.set(rowKey(row), row.text);
      usedMachine = true;
    }

    const missing = [...unique.values()].filter((ref) => !done.has(key(ref)));
    if (missing.length > 0 && this.translator.enabled) {
      const fresh = await this.translateMissing(missing, language);
      for (const [k, text] of fresh) done.set(k, text);
      if (fresh.size > 0) usedMachine = true;
    }

    let status: TranslationStatus = 'manual';
    if (done.size < unique.size) status = 'unavailable';
    else if (usedMachine) status = 'machine';

    return { status, get: (ref) => done.get(key(ref)) ?? ref.text };
  }

  /** A cache that cannot be read counts as empty: never fail the request. */
  private async readCache(
    user: AuthUser,
    entityIds: string[],
    language: TranslationLanguage,
  ): Promise<TranslationRow[]> {
    try {
      return await this.repository.findForEntities(
        user.accessToken,
        entityIds,
        language,
      );
    } catch (error) {
      this.logger.warn(
        `Could not read cached translations: ${describeError(error)}`,
      );
      return [];
    }
  }

  private async translateMissing(
    refs: TextRef[],
    language: TranslationLanguage,
  ): Promise<Map<string, string>> {
    const prepared: { ref: TextRef; text: PreparedText; offset: number }[] = [];
    const fragments: string[] = [];
    for (const ref of refs) {
      const text = MARKDOWN_FIELDS.has(ref.field)
        ? prepareMarkdown(ref.text)
        : prepareInline(ref.text);
      prepared.push({ ref, text, offset: fragments.length });
      fragments.push(...text.pieces);
    }

    let translated: string[];
    try {
      translated = await this.translator.translate(fragments, language);
    } catch (error) {
      this.logger.warn(`Machine translation failed: ${describeError(error)}`);
      return new Map();
    }

    const result = new Map<string, string>();
    const rows: TranslationRow[] = [];
    for (const { ref, text, offset } of prepared) {
      const output = text.assemble(
        translated.slice(offset, offset + text.pieces.length),
      );
      result.set(key(ref), output);
      rows.push({
        entity_type: ref.type,
        entity_id: ref.id,
        field: ref.field,
        language,
        source_hash: sourceHash(ref.text),
        text: output,
        provider: 'google',
        pipeline_version: PIPELINE_VERSION,
      });
    }

    try {
      await this.repository.saveMachine(rows);
    } catch (error) {
      // The learner still gets the translation; it is redone next time.
      this.logger.warn(`Could not cache translations: ${describeError(error)}`);
    }
    return result;
  }
}
