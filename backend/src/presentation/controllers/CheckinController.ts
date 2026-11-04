import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { CheckinNotAvailableError, PostgresCheckinRepository } from '../../infrastructure/repositories/PostgresCheckinRepository';

const repo = new PostgresCheckinRepository();

export class CheckinController {
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.getStatus(req.userId!) });
    } catch (error) {
      console.error('[Checkin] status error:', error);
      res.status(500).json({ success: false, error: 'Erro ao carregar o check-in.' });
    }
  }

  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    // O admin "vendo como empresa" não pode marcar presença nem ganhar prêmio pela pessoa.
    if (req.impersonated) {
      res.status(403).json({ success: false, error: 'Check-in indisponível no modo "ver como empresa".' });
      return;
    }
    try {
      const result = await repo.checkIn(req.userId!);
      if (result.reward) {
        console.log(`[Checkin] Prêmio para ${req.userId}: ${result.reward.days}d ${result.reward.tier} até ${result.reward.premiumUntil}`);
      }
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof CheckinNotAvailableError) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      console.error('[Checkin] check-in error:', error);
      res.status(500).json({ success: false, error: 'Não foi possível fazer o check-in. Tente novamente.' });
    }
  }

  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.getConfig() });
    } catch (error) {
      console.error('[Checkin] config error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.saveConfig(req.body ?? {}) });
    } catch (error) {
      console.error('[Checkin] update config error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.getAdminStats() });
    } catch (error) {
      console.error('[Checkin] stats error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
