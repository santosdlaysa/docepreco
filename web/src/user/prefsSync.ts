import { req } from './userApi';
import { getCurrency, setCurrency, Currency, CURRENCIES } from './format';
import { getUnitSystem, setUnitSystem, UnitSystem } from './units';
import { getLang, setLang, Lang } from '../i18n';
import { getPdfSettings, savePdfSettings, PdfSettings, DEFAULT_PDF_SETTINGS } from './localPrefs';
import { isDemoMode } from './demo/demoMode';

/**
 * Sincroniza com a conta (GET/PUT /auth/preferences) as preferências que antes
 * ficavam só neste navegador — assim web e app mostram a mesma moeda, unidades,
 * idioma e PDF. O localStorage continua sendo a cópia local usada na renderização.
 */
interface ServerPrefs {
  currency?: string;
  unitSystem?: UnitSystem;
  lang?: Lang;
  pdf?: Omit<Partial<PdfSettings>, 'logoBase64'> & { logoBase64?: string | null };
}

const SESSION_FLAG = 'docepreco_prefs_pulled';

/** Salva na conta (best-effort; falha de rede não atrapalha a tela). */
export async function pushPreferences(patch: ServerPrefs): Promise<void> {
  if (isDemoMode()) return;
  try {
    await req('/auth/preferences', { method: 'PUT', body: JSON.stringify(patch) });
  } catch { /* fica só local até a próxima mudança */ }
}

/**
 * Ao entrar: aplica localmente o que está na conta. Se a conta ainda não tem
 * nada salvo, sobe as preferências deste navegador (migração única).
 * Retorna true quando algo mudou e a página precisa recarregar para refletir.
 * Roda uma vez por sessão do navegador.
 */
export async function pullPreferences(userId: string): Promise<boolean> {
  if (isDemoMode()) return false;
  try {
    // Por usuário: trocar de conta na mesma aba sincroniza de novo.
    if (sessionStorage.getItem(SESSION_FLAG) === userId) return false;
    sessionStorage.setItem(SESSION_FLAG, userId);
  } catch { /* sem sessionStorage: segue mesmo assim */ }

  let server: ServerPrefs;
  try {
    server = (await req<ServerPrefs>('/auth/preferences')) ?? {};
  } catch {
    return false;
  }

  if (Object.keys(server).length === 0) {
    const pdf = getPdfSettings();
    await pushPreferences({ currency: getCurrency(), unitSystem: getUnitSystem(), lang: getLang(), pdf: { ...pdf, logoBase64: pdf.logoBase64 ?? null } });
    return false;
  }

  let changed = false;
  if (server.currency && server.currency in CURRENCIES && server.currency !== getCurrency()) {
    setCurrency(server.currency as Currency);
    changed = true;
  }
  if (server.unitSystem && server.unitSystem !== getUnitSystem()) {
    setUnitSystem(server.unitSystem);
    changed = true;
  }
  if (server.lang && server.lang !== getLang()) {
    setLang(server.lang);
    changed = true;
  }
  if (server.pdf) {
    const { logoBase64, ...rest } = server.pdf;
    savePdfSettings({ ...DEFAULT_PDF_SETTINGS, ...rest, ...(logoBase64 ? { logoBase64 } : {}) });
  }
  return changed;
}
