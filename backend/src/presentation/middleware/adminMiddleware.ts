import { Request, Response, NextFunction } from 'express';

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.DOCEPRECO_ADMIN_SECRET;
  if (!expected) {
    res.status(500).json({ error: 'Admin secret not configured' });
    return;
  }
  const provided = req.headers['x-admin-secret'];
  if (provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
