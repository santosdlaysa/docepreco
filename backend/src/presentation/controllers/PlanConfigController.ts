import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { DEFAULT_QR_MONTHLY, DEFAULT_QR_ANNUAL } from './pixQrDefaults';
import { AdBannerConfig, DEFAULT_AD_BANNER } from './adBannerDefaults';

interface PixPlanConfig {
  /** Valor em centavos (ex.: 1490 = R$ 14,90). */
  amountCents: number;
  /** Rótulo exibido no app (ex.: "R$ 14,90"). */
  priceLabel: string;
  /** Código PIX copia-e-cola. */
  copyPaste: string;
  /** Imagem do QR como data URI base64 (vazio → app usa o QR embutido). */
  qrImage: string;
}

interface PixConfig {
  monthly: PixPlanConfig;
  annual: PixPlanConfig;
  masterMonthly: PixPlanConfig;
  masterAnnual: PixPlanConfig;
}

interface PlanConfig {
  freeRecipeLimit: number;
  freeSaleLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
  premiumFreeDays: number;
  masterPrice: number;
  masterFeatures: string[];
  masterFreeDays: number;
  newUserTrialTier: 'free' | 'premium' | 'master';
  pix: PixConfig;
  adBanner: AdBannerConfig;
}

export const DEFAULT_PIX: PixConfig = {
  monthly: {
    amountCents: 1490,
    priceLabel: 'R$ 14,90',
    copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540514.905802BR5901N6001C62150511mensalidade630450C7',
    qrImage: DEFAULT_QR_MONTHLY,
  },
  annual: {
    amountCents: 12000,
    priceLabel: 'R$ 120,00',
    copyPaste: '00020126330014BR.GOV.BCB.PIX0111033810532805204000053039865406120.005802BR5901N6001C62090505ANUAL6304F5D2',
    qrImage: DEFAULT_QR_ANNUAL,
  },
  // Master mensal: código copia-e-cola embutido; QR vem do app (qrcode-pix-master-monthly).
  masterMonthly: {
    amountCents: 3000,
    priceLabel: 'R$ 30,00',
    copyPaste: '00020126330014BR.GOV.BCB.PIX011103381053280520400005303986540530.005802BR5901N6001C62070503***630448C1',
    qrImage: '',
  },
  // Master anual ainda sem QR/código próprios — o admin preenche no painel.
  masterAnnual: {
    amountCents: 30000,
    priceLabel: 'R$ 300,00',
    copyPaste: '',
    qrImage: '',
  },
};

const DEFAULTS: PlanConfig = {
  freeRecipeLimit: 3,
  freeSaleLimit: 20,
  premiumPrice: 14.90,
  premiumFeatures: ['Receitas ilimitadas', 'Ficha técnica em PDF', 'Relatórios avançados'],
  freeFeatures: ['Até 3 receitas', 'Cálculo de custos', 'Registro de vendas'],
  premiumFreeDays: 2,
  masterPrice: 30,
  masterFeatures: ['Tudo do Premium', 'Gestão financeira (DRE)', 'Controle de estoque', 'Dicas de vendas'],
  masterFreeDays: 3,
  newUserTrialTier: 'master',
  pix: DEFAULT_PIX,
  adBanner: DEFAULT_AD_BANNER,
};

/**
 * Lê os valores (em centavos) dos 4 planos PIX direto do app_settings, com
 * fallback para os defaults. Fonte canônica de preço no servidor — usada, por
 * exemplo, para calcular a diferença de um upgrade Premium → Master sem confiar
 * em valor enviado pelo app.
 */
export async function getPixAmountCents(): Promise<{
  monthly: number;
  annual: number;
  masterMonthly: number;
  masterAnnual: number;
}> {
  const result = await pool.query(
    `SELECT key, value FROM app_settings
     WHERE key IN ('plan_pix_monthly', 'plan_pix_annual', 'plan_pix_monthly_master', 'plan_pix_annual_master')`
  );
  const settings: Record<string, string> = {};
  for (const row of result.rows) settings[row.key] = row.value;

  const parse = (raw: string | undefined, fallback: number): number => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as Partial<PixPlanConfig>;
      return typeof parsed.amountCents === 'number' && parsed.amountCents > 0 ? parsed.amountCents : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    monthly: parse(settings.plan_pix_monthly, DEFAULT_PIX.monthly.amountCents),
    annual: parse(settings.plan_pix_annual, DEFAULT_PIX.annual.amountCents),
    masterMonthly: parse(settings.plan_pix_monthly_master, DEFAULT_PIX.masterMonthly.amountCents),
    masterAnnual: parse(settings.plan_pix_annual_master, DEFAULT_PIX.masterAnnual.amountCents),
  };
}

/** Faz merge raso de um PixPlanConfig parcial com o default correspondente. */
function mergePixPlan(stored: Partial<PixPlanConfig> | undefined, fallback: PixPlanConfig): PixPlanConfig {
  if (!stored) return fallback;
  return {
    amountCents: typeof stored.amountCents === 'number' ? stored.amountCents : fallback.amountCents,
    priceLabel: stored.priceLabel ?? fallback.priceLabel,
    copyPaste: stored.copyPaste ?? fallback.copyPaste,
    qrImage: stored.qrImage ?? fallback.qrImage,
  };
}

export class PlanConfigController {
  async get(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`SELECT key, value FROM app_settings WHERE key LIKE 'plan_%'`);
      const settings: Record<string, string> = {};
      for (const row of result.rows) settings[row.key] = row.value;

      const storedPixMonthly = settings.plan_pix_monthly ? JSON.parse(settings.plan_pix_monthly) : undefined;
      const storedPixAnnual = settings.plan_pix_annual ? JSON.parse(settings.plan_pix_annual) : undefined;
      const storedPixMasterMonthly = settings.plan_pix_monthly_master ? JSON.parse(settings.plan_pix_monthly_master) : undefined;
      const storedPixMasterAnnual = settings.plan_pix_annual_master ? JSON.parse(settings.plan_pix_annual_master) : undefined;
      const storedAdBanner = settings.plan_ad_banner ? JSON.parse(settings.plan_ad_banner) : undefined;

      const config: PlanConfig = {
        freeRecipeLimit: settings.plan_free_recipe_limit ? parseInt(settings.plan_free_recipe_limit) : DEFAULTS.freeRecipeLimit,
        freeSaleLimit: settings.plan_free_sale_limit ? parseInt(settings.plan_free_sale_limit) : DEFAULTS.freeSaleLimit,
        premiumPrice: settings.plan_premium_price ? parseFloat(settings.plan_premium_price) : DEFAULTS.premiumPrice,
        premiumFeatures: settings.plan_premium_features ? JSON.parse(settings.plan_premium_features) : DEFAULTS.premiumFeatures,
        freeFeatures: settings.plan_free_features ? JSON.parse(settings.plan_free_features) : DEFAULTS.freeFeatures,
        premiumFreeDays: settings.plan_premium_free_days ? parseInt(settings.plan_premium_free_days) : DEFAULTS.premiumFreeDays,
        masterPrice: settings.plan_master_price ? parseFloat(settings.plan_master_price) : DEFAULTS.masterPrice,
        masterFeatures: settings.plan_master_features ? JSON.parse(settings.plan_master_features) : DEFAULTS.masterFeatures,
        masterFreeDays: settings.plan_master_free_days ? parseInt(settings.plan_master_free_days) : DEFAULTS.masterFreeDays,
        newUserTrialTier: (settings.plan_new_user_trial_tier as any) || DEFAULTS.newUserTrialTier,
        pix: {
          monthly: mergePixPlan(storedPixMonthly, DEFAULT_PIX.monthly),
          annual: mergePixPlan(storedPixAnnual, DEFAULT_PIX.annual),
          masterMonthly: mergePixPlan(storedPixMasterMonthly, DEFAULT_PIX.masterMonthly),
          masterAnnual: mergePixPlan(storedPixMasterAnnual, DEFAULT_PIX.masterAnnual),
        },
        adBanner: {
          enabled: typeof storedAdBanner?.enabled === 'boolean' ? storedAdBanner.enabled : DEFAULT_AD_BANNER.enabled,
          periods: Array.isArray(storedAdBanner?.periods) && storedAdBanner.periods.length > 0
            ? storedAdBanner.periods
            : DEFAULT_AD_BANNER.periods,
        },
      };
      res.json({ success: true, data: config });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar configuração de planos' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { freeRecipeLimit, freeSaleLimit, premiumPrice, premiumFeatures, freeFeatures, premiumFreeDays, masterPrice, masterFeatures, masterFreeDays, newUserTrialTier, pix, adBanner } = req.body as Partial<PlanConfig>;
      const adBannerConfig: AdBannerConfig = {
        enabled: typeof adBanner?.enabled === 'boolean' ? adBanner.enabled : DEFAULT_AD_BANNER.enabled,
        periods: Array.isArray(adBanner?.periods) && adBanner.periods.length > 0 ? adBanner.periods : DEFAULT_AD_BANNER.periods,
      };
      const pixConfig: PixConfig = {
        monthly: mergePixPlan(pix?.monthly, DEFAULT_PIX.monthly),
        annual: mergePixPlan(pix?.annual, DEFAULT_PIX.annual),
        masterMonthly: mergePixPlan(pix?.masterMonthly, DEFAULT_PIX.masterMonthly),
        masterAnnual: mergePixPlan(pix?.masterAnnual, DEFAULT_PIX.masterAnnual),
      };
      const pairs: [string, string][] = [
        ['plan_free_recipe_limit', String(freeRecipeLimit ?? DEFAULTS.freeRecipeLimit)],
        ['plan_free_sale_limit', String(freeSaleLimit ?? DEFAULTS.freeSaleLimit)],
        ['plan_premium_price', String(premiumPrice ?? DEFAULTS.premiumPrice)],
        ['plan_premium_features', JSON.stringify(premiumFeatures ?? DEFAULTS.premiumFeatures)],
        ['plan_free_features', JSON.stringify(freeFeatures ?? DEFAULTS.freeFeatures)],
        ['plan_premium_free_days', String(premiumFreeDays ?? DEFAULTS.premiumFreeDays)],
        ['plan_master_price', String(masterPrice ?? DEFAULTS.masterPrice)],
        ['plan_master_features', JSON.stringify(masterFeatures ?? DEFAULTS.masterFeatures)],
        ['plan_master_free_days', String(masterFreeDays ?? DEFAULTS.masterFreeDays)],
        ['plan_new_user_trial_tier', newUserTrialTier ?? DEFAULTS.newUserTrialTier],
        ['plan_pix_monthly', JSON.stringify(pixConfig.monthly)],
        ['plan_pix_annual', JSON.stringify(pixConfig.annual)],
        ['plan_pix_monthly_master', JSON.stringify(pixConfig.masterMonthly)],
        ['plan_pix_annual_master', JSON.stringify(pixConfig.masterAnnual)],
        ['plan_ad_banner', JSON.stringify(adBannerConfig)],
      ];
      for (const [key, value] of pairs) {
        await pool.query(
          `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
      const config: PlanConfig = {
        freeRecipeLimit: freeRecipeLimit ?? DEFAULTS.freeRecipeLimit,
        freeSaleLimit: freeSaleLimit ?? DEFAULTS.freeSaleLimit,
        premiumPrice: premiumPrice ?? DEFAULTS.premiumPrice,
        premiumFeatures: premiumFeatures ?? DEFAULTS.premiumFeatures,
        freeFeatures: freeFeatures ?? DEFAULTS.freeFeatures,
        premiumFreeDays: premiumFreeDays ?? DEFAULTS.premiumFreeDays,
        masterPrice: masterPrice ?? DEFAULTS.masterPrice,
        masterFeatures: masterFeatures ?? DEFAULTS.masterFeatures,
        masterFreeDays: masterFreeDays ?? DEFAULTS.masterFreeDays,
        newUserTrialTier: newUserTrialTier ?? DEFAULTS.newUserTrialTier,
        pix: pixConfig,
        adBanner: adBannerConfig,
      };
      res.json({ success: true, data: config });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar configuração de planos' });
    }
  }
}
