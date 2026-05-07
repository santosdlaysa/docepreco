import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';

let deviceLanguage = 'pt';
try {
  const { getLocales } = require('expo-localization');
  deviceLanguage = getLocales()[0]?.languageCode ?? 'pt';
} catch {
  // Native module not available (old binary receiving OTA update) — fall back to Portuguese
}

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: ptBR },
    en: { translation: en },
  },
  lng: deviceLanguage === 'en' ? 'en' : 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

export default i18n;
