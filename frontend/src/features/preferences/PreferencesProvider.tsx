import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import i18n, { initialLanguage } from '../../i18n';
import { LANGUAGE_STORAGE_KEY, type Language } from '../../i18n/language';
import { readPreference, writePreference } from '../../lib/preference-storage';
import { buildAntdTheme } from './antd-theme';
import { PreferencesContext, type Preferences } from './preferences-context';
import {
  parseThemeMode,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from './theme-mode';

const ANTD_LOCALES = { en: enUS, vi: viVN } as const;
const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Tracks an OS-level media query such as dark mode or reduced motion. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    parseThemeMode(readPreference(THEME_STORAGE_KEY)),
  );
  const systemPrefersDark = useMediaQuery(DARK_QUERY);
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const resolvedTheme = resolveTheme(themeMode, systemPrefersDark);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writePreference(LANGUAGE_STORAGE_KEY, next);
    void i18n.changeLanguage(next);
    document.documentElement.lang = next;
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setThemeModeState(next);
    writePreference(THEME_STORAGE_KEY, next);
  }, []);

  // SCSS reads colors from CSS variables keyed on this attribute.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<Preferences>(
    () => ({ language, setLanguage, themeMode, setThemeMode, resolvedTheme }),
    [language, setLanguage, themeMode, setThemeMode, resolvedTheme],
  );
  const antdTheme = useMemo(
    () => buildAntdTheme(resolvedTheme, { reduceMotion }),
    [resolvedTheme, reduceMotion],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <ConfigProvider theme={antdTheme} locale={ANTD_LOCALES[language]}>
        {children}
      </ConfigProvider>
    </PreferencesContext.Provider>
  );
}
