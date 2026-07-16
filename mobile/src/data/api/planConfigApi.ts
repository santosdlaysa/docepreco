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
  masterMonthly: PixPlanConfig;
  masterAnnual: PixPlanConfig;
}

export interface AdBannerPeriod {
  days: number;
  amountCents: number;
  priceLabel: string;
}

export interface AdBannerConfig {
  enabled: boolean;
  periods: AdBannerPeriod[];
}

interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
  premiumFreeDays?: number;
  masterPrice?: number;
  masterFeatures?: string[];
  masterFreeDays?: number;
  newUserTrialTier?: 'free' | 'premium' | 'master';
  pix?: PixConfig;
  adBanner?: AdBannerConfig;
}

export interface MasterInfo {
  price: number;
  features: string[];
}

export interface TrialConfig {
  premiumFreeDays: number;
  masterFreeDays: number;
  newUserTrialTier: 'free' | 'premium' | 'master';
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

  /** Preço mensal do plano Premium, gerenciado pelo painel web. */
  async getPremiumPrice(): Promise<number | null> {
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      return data.data.premiumPrice ?? null;
    } catch {
      return null;
    }
  },

  /** Preço e funcionalidades do plano Master, gerenciados pelo painel web. */
  async getMasterInfo(): Promise<MasterInfo | null> {
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      return {
        price: data.data.masterPrice ?? 30,
        features: data.data.masterFeatures ?? [],
      };
    } catch {
      return null;
    }
  },

  /** Configuração de dias grátis (trial) para cada plano. */
  async getTrialConfig(): Promise<TrialConfig | null> {
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      return {
        premiumFreeDays: data.data.premiumFreeDays ?? 2,
        masterFreeDays: data.data.masterFreeDays ?? 3,
        newUserTrialTier: data.data.newUserTrialTier ?? 'master',
      };
    } catch {
      return null;
    }
  },

  /** Config de venda de anúncios no carrossel (preços e períodos). */
  async getAdBannerConfig(): Promise<AdBannerConfig | null> {
    try {
      const { data } = await axios.get<{ success: boolean; data: PlanConfig }>(
        `${BASE_URL}/admin/settings/plans`,
        { timeout: 10000 },
      );
      return data.data.adBanner ?? null;
    } catch {
      return null;
    }
  },

  clearCache() {
    cachedLimit = null;
  },
};
