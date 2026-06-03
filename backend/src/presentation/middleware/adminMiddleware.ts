import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../infrastructure/database/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'sweet-pricing-secret';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'santosdlaysa@gmail.com').toLowerCase();

/**
 * Autoriza acesso admin por uma de duas formas:
 *  1) header x-admin-secret === DOCEPRECO_ADMIN_SECRET (painel web);
 *  2) JWT (Authorization: Bearer) de um usuário cujo e-mail é o ADMIN_EMAIL (app mobile).
 */
export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1) Secret de admin
  const expected = process.env.DOCEPRECO_ADMIN_SECRET;
  const provided = req.headers['x-admin-secret'];
  if (expected && provided && provided === expected) {
    next();
    return;
  }

  // 2) JWT do usuário admin
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const result = await pool.query('SELECT email FROM users WHERE id = $1', [payload.userId]);
      const email = (result.rows[0]?.email as string | undefined)?.toLowerCase();
      if (email && email === ADMIN_EMAIL) {
        next();
        return;
      }
    } catch {
      // token inválido/expirado → cai no 401 abaixo
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
}
