import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docepreco.onrender.com/api';

export interface PixPlanConfig {
  /** Valor em centavos (ex.: 1490 = R$ 14,90). */
  amountCents: number;
  /** Rótulo exibido (ex.: "R$ 14,90"). */
  priceLabel: string;
  /** Código PIX copia-e-cola. */
  copyPaste: string;
  /** QR como data URI base64 (vazio → app usa o QR embutido). */
  qrImage: string;
}

export interface PixConfig {
  monthly: PixPlanConfig;
  annual: PixPlanConfig;
}

interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
  pix?: PixConfig;
}

let cachedLimit: number | null = null;

export const planConfigApi = {
  async getFreeRecipeLimit(): Promise<number> {
    if (cachedLimit !== null) return cachedLimit;
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      cachedLimit = data.data.freeRecipeLimit;
      return cachedLimit;
    } catch {
      return 3; // fallback
    }
  },

  /** Busca a config de PIX (valor, código e QR) gerenciada pelo painel web.
   *  Retorna null em caso de erro — o app usa então os valores embutidos. */
  async getPixConfig(): Promise<PixConfig | null> {
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      return data.data.pix ?? null;
    } catch {
      return null;
    }
  },

  clearCache() {
    cachedLimit = null;
  },
};
