import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { TranslationLanguage } from './translator.js';

export type TranslatableEntity = 'course' | 'module' | 'lesson' | 'exercise';

/**
 * Exercise review texts (`explanation`, `model_answer`, `rubric.<id>`) are
 * readable by a learner only after an attempt (RLS), like the answer itself.
 */
export type TranslatableField =
  | 'title'
  | 'description'
  | 'content_md'
  | 'question'
  | 'explanation'
  | 'model_answer'
  | `${'option' | 'item' | 'category' | 'rubric'}.${string}`;

/** Fields translated as Markdown documents (line by line, code kept). */
export const MARKDOWN_FIELDS: ReadonlySet<TranslatableField> = new Set([
  'content_md',
  'question',
  'explanation',
  'model_answer',
]);

/** `manual`: written by a person, preferred. `google`: machine, cached. */
export type TranslationProvider = 'manual' | 'google';

/** Row of `public.content_translations`. */
export interface TranslationRow {
  entity_type: TranslatableEntity;
  entity_id: string;
  field: TranslatableField;
  language: TranslationLanguage;
  source_hash: string;
  text: string;
  provider: TranslationProvider;
  /** Set for machine rows only: the pipeline that produced them. */
  pipeline_version: number | null;
}

export interface StoredTranslationRow extends TranslationRow {
  updated_at: string;
}

/** A manual translation written by an admin. */
export type ManualTranslationWrite = Pick<
  TranslationRow,
  'entity_type' | 'entity_id' | 'field' | 'language' | 'source_hash' | 'text'
>;

const COLUMNS =
  'entity_type, entity_id, field, language, source_hash, text, provider, pipeline_version';

/**
 * Translations: manual ones (curriculum importer, Admin CMS) and cached
 * machine ones. Reads run as the user (RLS: only content the learner can
 * see; admins read all). Machine rows are written with the service role;
 * manual ones from the CMS as the admin (RLS `is_admin()`, manual only).
 * Learners write nothing (a learner-written row would be shown to everyone).
 */
@Injectable()
export class TranslationsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findForEntities(
    accessToken: string,
    entityIds: string[],
    language: TranslationLanguage,
  ): Promise<TranslationRow[]> {
    if (entityIds.length === 0) return [];
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('content_translations')
      .select(COLUMNS)
      .eq('language', language)
      .in('entity_id', entityIds)
      .overrideTypes<TranslationRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /** Every translation of one row, manual and machine (Admin CMS, RLS). */
  async findForEntity(
    accessToken: string,
    entityType: TranslatableEntity,
    entityId: string,
    language: TranslationLanguage,
  ): Promise<StoredTranslationRow[]> {
    const { data, error } = await this.supabase
      .forUser(accessToken)
      .from('content_translations')
      .select(`${COLUMNS}, updated_at`)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('language', language)
      .overrideTypes<StoredTranslationRow[], { merge: false }>();
    if (error) throw error;
    return data;
  }

  /**
   * Writes manual translations as the admin (RLS: `is_admin()`, manual rows
   * only), in one statement.
   */
  async saveManual(
    accessToken: string,
    rows: ManualTranslationWrite[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('content_translations')
      .upsert(
        rows.map((row) => ({ ...row, provider: 'manual' })),
        { onConflict: 'entity_type,entity_id,field,language,provider' },
      );
    if (error) throw error;
  }

  /** Removes manual translations of some fields, as the admin. */
  async removeManual(
    accessToken: string,
    entityType: TranslatableEntity,
    entityId: string,
    language: TranslationLanguage,
    fields: TranslatableField[],
  ): Promise<void> {
    if (fields.length === 0) return;
    const { error } = await this.supabase
      .forUser(accessToken)
      .from('content_translations')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('language', language)
      .eq('provider', 'manual')
      .in('field', fields);
    if (error) throw error;
  }

  /** Saves machine translations. Manual rows are separate and untouched. */
  async saveMachine(rows: TranslationRow[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.supabase
      .service()
      .from('content_translations')
      .upsert(rows, {
        onConflict: 'entity_type,entity_id,field,language,provider',
      });
    if (error) throw error;
  }
}
