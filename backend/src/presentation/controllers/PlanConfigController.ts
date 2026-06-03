import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { DEFAULT_QR_MONTHLY, DEFAULT_QR_ANNUAL } from './pixQrDefaults';

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
}

interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
  pix: PixConfig;
}

const DEFAULT_PIX: PixConfig = {
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
};

const DEFAULTS: PlanConfig = {
  freeRecipeLimit: 3,
  premiumPrice: 14.90,
  premiumFeatures: ['Receitas ilimitadas', 'Ficha técnica em PDF', 'Relatórios avançados'],
  freeFeatures: ['Até 3 receitas', 'Cálculo de custos', 'Registro de vendas'],
  pix: DEFAULT_PIX,
};

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

      const config: PlanConfig = {
        freeRecipeLimit: settings.plan_free_recipe_limit ? parseInt(settings.plan_free_recipe_limit) : DEFAULTS.freeRecipeLimit,
        premiumPrice: settings.plan_premium_price ? parseFloat(settings.plan_premium_price) : DEFAULTS.premiumPrice,
        premiumFeatures: settings.plan_premium_features ? JSON.parse(settings.plan_premium_features) : DEFAULTS.premiumFeatures,
        freeFeatures: settings.plan_free_features ? JSON.parse(settings.plan_free_features) : DEFAULTS.freeFeatures,
        pix: {
          monthly: mergePixPlan(storedPixMonthly, DEFAULT_PIX.monthly),
          annual: mergePixPlan(storedPixAnnual, DEFAULT_PIX.annual),
        },
      };
      res.json({ success: true, data: config });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar configuração de planos' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { freeRecipeLimit, premiumPrice, premiumFeatures, freeFeatures, pix } = req.body as Partial<PlanConfig>;
      const pixConfig: PixConfig = {
        monthly: mergePixPlan(pix?.monthly, DEFAULT_PIX.monthly),
        annual: mergePixPlan(pix?.annual, DEFAULT_PIX.annual),
      };
      const pairs: [string, string][] = [
        ['plan_free_recipe_limit', String(freeRecipeLimit ?? DEFAULTS.freeRecipeLimit)],
        ['plan_premium_price', String(premiumPrice ?? DEFAULTS.premiumPrice)],
        ['plan_premium_features', JSON.stringify(premiumFeatures ?? DEFAULTS.premiumFeatures)],
        ['plan_free_features', JSON.stringify(freeFeatures ?? DEFAULTS.freeFeatures)],
        ['plan_pix_monthly', JSON.stringify(pixConfig.monthly)],
        ['plan_pix_annual', JSON.stringify(pixConfig.annual)],
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
        premiumPrice: premiumPrice ?? DEFAULTS.premiumPrice,
        premiumFeatures: premiumFeatures ?? DEFAULTS.premiumFeatures,
        freeFeatures: freeFeatures ?? DEFAULTS.freeFeatures,
        pix: pixConfig,
      };
      res.json({ success: true, data: config });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar configuração de planos' });
    }
  }
}
