import { createContext, useContext } from 'react';
import type { Language } from '../../i18n/language';
import type { ResolvedTheme, ThemeMode } from './theme-mode';

export interface Preferences {
  language: Language;
  setLanguage: (language: Language) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** The theme actually applied after resolving `system`. */
  resolvedTheme: ResolvedTheme;
}

export const PreferencesContext = createContext<Preferences | null>(null);

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error('usePreferences must be used inside <PreferencesProvider>');
  }
  return value;
}
