import { Response, NextFunction } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { hasTier } from '../../domain/services/premium';
import { PlanTier } from '../../domain/entities/User';
import { AuthRequest } from './authMiddleware';

/**
 * Bloqueia a rota para quem não tem o tier mínimo vigente (respeita premium_until).
 * Responde 403 com code PLAN_REQUIRED — o app usa isso para abrir o paywall.
 * Deve ser usado depois do authMiddleware (depende de req.userId).
 */
export function requireTier(tier: PlanTier) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await pool.query(
        'SELECT plan_tier, premium_until FROM users WHERE id = $1',
        [req.userId]
      );
      const row = result.rows[0];
      const user = {
        planTier: (row?.plan_tier ?? 'free') as PlanTier,
        premiumUntil: row?.premium_until ? new Date(row.premium_until).toISOString() : null,
      };
      if (!row || !hasTier(user, tier)) {
        res.status(403).json({
          success: false,
          error: 'Este recurso é exclusivo para assinantes. Renove seu plano para continuar.',
          code: 'PLAN_REQUIRED',
          requiredTier: tier,
        });
        return;
      }
      next();
    } catch (error) {
      console.error('[requireTier] error:', error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  };
}
