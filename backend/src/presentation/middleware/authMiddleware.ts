import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../infrastructure/database/connection';
import { getJwtSecret } from '../../config/secrets';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { userId: string; imp?: boolean };
    req.userId = payload.userId;

    // Fire-and-forget: update last_seen_at (sessões impersonadas pelo admin não contam)
    if (!payload.imp) {
      pool.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [payload.userId]).catch(() => {});
    }

    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
}
