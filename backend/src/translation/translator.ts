import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';

export const TRANSLATION_LANGUAGES = ['vi'] as const;
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

/**
 * Machine translator for HTML fragments (English source). Also the DI token:
 * tests replace it with a fake.
 */
export abstract class Translator {
  /** False when no provider is configured; callers fall back to English. */
  abstract get enabled(): boolean;

  /** Same length and order as `fragments`. Throws on any provider error. */
  abstract translate(
    fragments: string[],
    target: TranslationLanguage,
  ): Promise<string[]>;
}

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
// Google's guidance for v2: at most 128 segments and ~5k characters per call.
const MAX_SEGMENTS = 100;
const MAX_CHARS = 5000;
const TIMEOUT_MS = 10_000;

interface GoogleResponse {
  data?: { translations?: { translatedText?: string }[] };
}

/** Google Cloud Translation API v2 (`format: html`). */
@Injectable()
export class GoogleTranslator extends Translator {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  get enabled(): boolean {
    return this.config.googleTranslateApiKey !== '';
  }

  async translate(
    fragments: string[],
    target: TranslationLanguage,
  ): Promise<string[]> {
    const results: string[] = [];
    for (const batch of batches(fragments)) {
      results.push(...(await this.request(batch, target)));
    }
    return results;
  }

  private async request(
    batch: string[],
    target: TranslationLanguage,
  ): Promise<string[]> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header, not `?key=`: keeps the key out of URLs and proxy logs.
        'X-Goog-Api-Key': this.config.googleTranslateApiKey,
      },
      body: JSON.stringify({ q: batch, source: 'en', target, format: 'html' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      // Never include the request (it carries the key) in the error.
      throw new Error(`Translation provider answered HTTP ${response.status}`);
    }
    const body = (await response.json()) as GoogleResponse;
    const translations = body.data?.translations ?? [];
    if (translations.length !== batch.length) {
      throw new Error('Translation provider returned an unexpected shape');
    }
    return translations.map((t) => t.translatedText ?? '');
  }
}

/** Splits fragments into provider-sized requests, keeping order. */
export function batches(fragments: string[]): string[][] {
  const result: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const fragment of fragments) {
    if (
      current.length > 0 &&
      (current.length >= MAX_SEGMENTS || chars + fragment.length > MAX_CHARS)
    ) {
      result.push(current);
      current = [];
      chars = 0;
    }
    current.push(fragment);
    chars += fragment.length;
  }
  if (current.length > 0) result.push(current);
  return result;
}
