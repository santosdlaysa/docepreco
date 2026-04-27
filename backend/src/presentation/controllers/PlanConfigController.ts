import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';

interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
}

const DEFAULTS: PlanConfig = {
  freeRecipeLimit: 5,
  premiumPrice: 14.90,
  premiumFeatures: ['Receitas ilimitadas', 'Ficha técnica em PDF', 'Relatórios avançados'],
  freeFeatures: ['Até 5 receitas', 'Cálculo de custos', 'Registro de vendas'],
};

export class PlanConfigController {
  async get(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`SELECT key, value FROM app_settings WHERE key LIKE 'plan_%'`);
      const settings: Record<string, string> = {};
      for (const row of result.rows) settings[row.key] = row.value;

      const config: PlanConfig = {
        freeRecipeLimit: settings.plan_free_recipe_limit ? parseInt(settings.plan_free_recipe_limit) : DEFAULTS.freeRecipeLimit,
        premiumPrice: settings.plan_premium_price ? parseFloat(settings.plan_premium_price) : DEFAULTS.premiumPrice,
        premiumFeatures: settings.plan_premium_features ? JSON.parse(settings.plan_premium_features) : DEFAULTS.premiumFeatures,
        freeFeatures: settings.plan_free_features ? JSON.parse(settings.plan_free_features) : DEFAULTS.freeFeatures,
      };
      res.json({ success: true, data: config });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar configuração de planos' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { freeRecipeLimit, premiumPrice, premiumFeatures, freeFeatures } = req.body;
      const pairs: [string, string][] = [
        ['plan_free_recipe_limit', String(freeRecipeLimit ?? DEFAULTS.freeRecipeLimit)],
        ['plan_premium_price', String(premiumPrice ?? DEFAULTS.premiumPrice)],
        ['plan_premium_features', JSON.stringify(premiumFeatures ?? DEFAULTS.premiumFeatures)],
        ['plan_free_features', JSON.stringify(freeFeatures ?? DEFAULTS.freeFeatures)],
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
      };
      res.json({ success: true, data: config });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar configuração de planos' });
    }
  }
}
