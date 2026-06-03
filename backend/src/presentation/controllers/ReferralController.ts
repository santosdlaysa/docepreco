import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresReferralRepository } from '../../infrastructure/repositories/PostgresReferralRepository';
import { processManualValidation } from '../../infrastructure/services/referralService';

const repo = new PostgresReferralRepository();

export class ReferralController {
  /** GET /api/referrals/me — código + progresso + histórico (mobile). */
  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const progress = await repo.getProgress(userId);
      const history = await repo.getHistory(userId);
      res.json({ success: true, data: { ...progress, history } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  /** GET /api/referrals/progress — só o progresso (mobile). */
  async getProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const progress = await repo.getProgress(req.userId!);
      res.json({ success: true, data: progress });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  // ───────────────────────── Admin ─────────────────────────

  /** GET /api/admin/referrals?status=all|pending|valid|rewarded|invalid */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const status = (req.query.status as string) || 'all';
      const data = await repo.listAll(status);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** GET /api/admin/referrals/stats */
  async stats(_req: Request, res: Response): Promise<void> {
    try {
      const data = await repo.stats();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** POST /api/admin/referrals/:id/invalidate */
  async invalidate(req: Request, res: Response): Promise<void> {
    try {
      const ok = await repo.invalidate(req.params.id);
      if (!ok) {
        res.status(400).json({ success: false, error: 'Indicação não encontrada ou já recompensada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /** POST /api/admin/referrals/:id/force-valid */
  async forceValid(req: Request, res: Response): Promise<void> {
    try {
      const referrerId = await repo.forceValid(req.params.id);
      if (!referrerId) {
        res.status(400).json({ success: false, error: 'Indicação não encontrada ou já processada' });
        return;
      }
      processManualValidation(referrerId).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
