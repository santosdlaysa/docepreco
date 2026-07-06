import { pool } from '../../infrastructure/database/connection';

/** Uma opção de período de anúncio no carrossel (ex.: 7 dias por R$ 9,90). */
export interface AdBannerPeriod {
  days: number;
  amountCents: number;
  priceLabel: string;
}

export interface AdBannerConfig {
  /** Se a venda de anúncios está habilitada no app. */
  enabled: boolean;
  /** Períodos disponíveis para compra. */
  periods: AdBannerPeriod[];
}

/** Configuração padrão — o admin pode sobrescrever pelo painel (chave app_settings `plan_ad_banner`). */
export const DEFAULT_AD_BANNER: AdBannerConfig = {
  enabled: true,
  periods: [
    { days: 7, amountCents: 990, priceLabel: 'R$ 9,90' },
    { days: 15, amountCents: 1790, priceLabel: 'R$ 17,90' },
    { days: 30, amountCents: 2990, priceLabel: 'R$ 29,90' },
  ],
};

/** Lê a config de anúncios do app_settings, caindo no default se ausente/inválida. */
export async function getAdBannerConfig(): Promise<AdBannerConfig> {
  try {
    const result = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'plan_ad_banner' LIMIT 1`
    );
    if (result.rows.length > 0 && result.rows[0].value) {
      const parsed = JSON.parse(result.rows[0].value) as Partial<AdBannerConfig>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AD_BANNER.enabled,
        periods: Array.isArray(parsed.periods) && parsed.periods.length > 0
          ? parsed.periods
          : DEFAULT_AD_BANNER.periods,
      };
    }
  } catch {
    // ignore — usa default
  }
  return DEFAULT_AD_BANNER;
}
