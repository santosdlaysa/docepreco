import { Request, Response } from 'express';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { pool } from '../../infrastructure/database/connection';

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
      const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
      if (userExists.rows.length === 0) {
        res.status(401).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      const pushToken = await repo.upsert(userId, token, platform);
      res.status(201).json({ success: true, data: pushToken });
    } catch (err) {
      console.error('Erro ao registrar push token:', err);
      res.locals.errorMessage = err instanceof Error ? err.message : String(err);
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
    } catch (err) {
      console.error('Erro ao remover push token:', err);
      res.locals.errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: 'Erro ao remover push token' });
    }
  }
}
