import { Router, Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';

const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users)   AS "totalUsers",
        (SELECT COUNT(*)::int FROM recipes)  AS "totalRecipes"
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Public] stats error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
