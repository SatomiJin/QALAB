import { describe, expect, it } from 'vitest';
import { parseThemeMode, resolveTheme } from './theme-mode';

describe('parseThemeMode', () => {
  it('accepts saved modes', () => {
    expect(parseThemeMode('light')).toBe('light');
    expect(parseThemeMode('dark')).toBe('dark');
    expect(parseThemeMode('system')).toBe('system');
  });

  it('defaults to system for missing or invalid values', () => {
    expect(parseThemeMode(null)).toBe('system');
    expect(parseThemeMode('blue')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('uses explicit modes as-is', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the OS for system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});
