import { Request, Response } from 'express';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';

const repo = new PostgresPushTokenRepository();

export class PushTokenController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { token, platform } = req.body;
      if (!token || !platform) {
        res.status(400).json({ success: false, error: 'token e platform são obrigatórios' });
        return;
      }
      if (!['ios', 'android'].includes(platform)) {
        res.status(400).json({ success: false, error: 'platform inválido' });
        return;
      }
      const pushToken = await repo.upsert(userId, token, platform);
      res.status(201).json({ success: true, data: pushToken });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao registrar push token' });
    }
  }

  async unregister(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, error: 'token é obrigatório' });
        return;
      }
      await repo.removeByToken(token);
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao remover push token' });
    }
  }
}
