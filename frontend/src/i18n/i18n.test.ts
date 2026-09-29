import { describe, expect, it } from 'vitest';
import { detectLanguage } from './language';
import { en } from './locales/en';
import { vi } from './locales/vi';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === 'string'
        ? { ...acc, [path]: value }
        : { ...acc, ...flatten(value, path) };
    },
    {},
  );
}

describe('translations', () => {
  const enKeys = flatten(en);
  const viKeys = flatten(vi);

  it('have the same keys in every language', () => {
    expect(Object.keys(viKeys).sort()).toEqual(Object.keys(enKeys).sort());
  });

  it('have no missing Vietnamese text where English has text', () => {
    const missing = Object.keys(enKeys).filter(
      (key) => enKeys[key] !== '' && viKeys[key] === '',
    );
    expect(missing).toEqual([]);
  });

  it('keep the same interpolation placeholders', () => {
    const placeholders = (text: string) =>
      (text.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const key of Object.keys(enKeys)) {
      expect(placeholders(viKeys[key]), key).toEqual(placeholders(enKeys[key]));
    }
  });
});

describe('detectLanguage', () => {
  it('prefers the saved language', () => {
    expect(detectLanguage('vi', ['en-US'])).toBe('vi');
  });

  it('falls back to the first supported browser language', () => {
    expect(detectLanguage(null, ['fr-FR', 'vi-VN', 'en'])).toBe('vi');
  });

  it('ignores invalid saved values', () => {
    expect(detectLanguage('de', ['en-GB'])).toBe('en');
  });

  it('defaults to English', () => {
    expect(detectLanguage(null, ['ja-JP'])).toBe('en');
    expect(detectLanguage(null, [])).toBe('en');
  });
});
