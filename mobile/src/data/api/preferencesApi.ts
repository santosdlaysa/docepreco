import { apiClient } from './client';
import { isDemoMode } from '../demo/demoMode';

/**
 * Preferências guardadas na conta (moeda, unidades, PDF) — as mesmas da web
 * (GET/PUT /auth/preferences). O AsyncStorage continua sendo a cópia local.
 * O idioma do app segue o aparelho, então `lang` não é usado aqui.
 */
export interface ServerPreferences {
  currency?: string;
  unitSystem?: 'metric' | 'imperial';
  lang?: 'pt' | 'en';
  pdf?: { brandColor?: string; companySlogan?: string; hideWatermark?: boolean; logoBase64?: string | null };
}

export const preferencesApi = {
  get: async (): Promise<ServerPreferences> => {
    const res = await apiClient.get('/auth/preferences');
    return res.data?.data ?? {};
  },
  /** Best-effort: falha de rede não atrapalha a tela (fica só local). */
  push: async (patch: ServerPreferences): Promise<void> => {
    if (isDemoMode()) return;
    try { await apiClient.put('/auth/preferences', patch); } catch { /* ignora */ }
  },
};
