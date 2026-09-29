import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readPreference } from '../lib/preference-storage';
import {
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from './language';
import { en } from './locales/en';
import { vi } from './locales/vi';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

export const initialLanguage: Language = detectLanguage(
  readPreference(LANGUAGE_STORAGE_KEY),
  typeof navigator === 'undefined' ? [] : navigator.languages,
);

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes output.
  returnNull: false,
});

document.documentElement.lang = initialLanguage;

export default i18n;
