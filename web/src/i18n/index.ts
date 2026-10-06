import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Idioma da web do confeiteiro: português (padrão) ou inglês — igual ao app,
 * que segue o idioma do aparelho. Aqui segue o idioma do navegador, com opção
 * de escolha manual no Perfil (fica no navegador).
 *
 * Textos ficam em um JSON por grupo de telas (namespace), em
 * locales/<pt|en>/<namespace>.json — carregados automaticamente.
 */
export type Lang = 'pt' | 'en';

const LANG_KEY = 'docepreco_lang';

const files = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>>;
const resources: Record<string, Record<string, Record<string, unknown>>> = { pt: {}, en: {} };
for (const [path, data] of Object.entries(files)) {
  const m = path.match(/\.\/locales\/(\w+)\/([\w-]+)\.json$/);
  if (m && resources[m[1]]) resources[m[1]][m[2]] = data;
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch { /* storage indisponível */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('en') ? 'en' : 'pt';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLang(),
  fallbackLng: 'pt',
  defaultNS: 'common',
  ns: Object.keys(resources.pt).length ? Object.keys(resources.pt) : ['common'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function getLang(): Lang {
  return i18n.language === 'en' ? 'en' : 'pt';
}

/** Troca o idioma e lembra a escolha neste navegador. */
export function setLang(lang: Lang): void {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignora */ }
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
}

document.documentElement.lang = getLang() === 'en' ? 'en' : 'pt-BR';

export default i18n;
