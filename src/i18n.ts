import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en', // if we don't have a translation for their language, use English
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Only ever guess from the device/browser language setting or a
      // saved manual choice — NEVER from IP address or location.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // remembers the user's manual choice
    },
  });

export default i18n;
