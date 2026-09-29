export const LANGUAGES = ['en', 'vi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'qalab.language';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Picks the initial language: saved choice first, then the browser's
 * preferred languages (`vi-VN` → `vi`), then the default.
 */
export function detectLanguage(
  saved: string | null,
  browserLanguages: readonly string[],
): Language {
  if (isLanguage(saved)) return saved;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
