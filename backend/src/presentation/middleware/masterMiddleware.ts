import { Response, NextFunction } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from './authMiddleware';

export async function masterMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query('SELECT plan_tier FROM users WHERE id = $1', [req.userId]);
    if (result.rows[0]?.plan_tier !== 'master') {
      res.status(403).json({ success: false, error: 'Recurso exclusivo do plano Master' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ success: false, error: 'Erro ao verificar plano' });
  }
}
