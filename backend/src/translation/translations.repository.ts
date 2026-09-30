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

const COLUMNS =
  'entity_type, entity_id, field, language, source_hash, text, provider, pipeline_version';

/**
 * Translations: manual ones (seed, later the Admin CMS) and cached machine
 * ones. Reads run as the user (RLS: only content the
 * learner can see). Writes use the service role: translations are generated
 * by the server and no API role may write them (a learner-written row would
 * be shown to everyone).
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
