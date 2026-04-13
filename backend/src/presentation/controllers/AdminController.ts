import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';

export class AdminController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [statsRes, topRevenueRes, topActivityRes] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users)                                                        AS "totalUsers",
            (SELECT COUNT(*)::int FROM users WHERE is_premium = TRUE)                               AS "premiumUsers",
            (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days')         AS "newUsersWeek",
            (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '1 day')          AS "newUsersToday",
            (SELECT COUNT(*)::int FROM recipes)                                                      AS "totalRecipes",
            (SELECT COUNT(*)::int FROM ingredients)                                                  AS "totalIngredients",
            (SELECT COUNT(*)::int FROM sales)                                                        AS "totalSales",
            (SELECT COALESCE(SUM(total_revenue), 0)::float FROM sales)                              AS "totalRevenue",
            (SELECT COALESCE(SUM(total_revenue), 0)::float FROM sales
             WHERE sale_date >= date_trunc('month', NOW()))                                          AS "revenueThisMonth"
        `),
        pool.query(`
          SELECT
            u.id,
            u.company_name AS "companyName",
            u.is_premium   AS "isPremium",
            COALESCE(SUM(s.total_revenue), 0)::float AS "totalRevenue"
          FROM users u
          LEFT JOIN sales s ON s.user_id = u.id
          GROUP BY u.id
          ORDER BY "totalRevenue" DESC
          LIMIT 5
        `),
        pool.query(`
          SELECT
            u.id,
            u.company_name AS "companyName",
            u.is_premium   AS "isPremium",
            (SELECT COUNT(*)::int FROM sales      s WHERE s.user_id = u.id AND s.sale_date >= NOW() - INTERVAL '30 days') AS "salesMonth",
            (SELECT COUNT(*)::int FROM recipes    r WHERE r.user_id = u.id)  AS "recipeCount",
            (SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) AS "ingredientCount"
          FROM users u
          ORDER BY "salesMonth" DESC, "recipeCount" DESC
          LIMIT 5
        `),
      ]);

      res.json({
        success: true,
        data: {
          ...statsRes.rows[0],
          topByRevenue: topRevenueRes.rows,
          topByActivity: topActivityRes.rows,
        },
      });
    } catch (error) {
      console.error('[Admin] getStats error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const isPremiumFilter = req.query.isPremium;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.company_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (isPremiumFilter === 'true') conditions.push(`u.is_premium = TRUE`);
    else if (isPremiumFilter === 'false') conditions.push(`u.is_premium = FALSE`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const [countRes, usersRes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params),
        pool.query(
          `SELECT
            u.id,
            u.company_name              AS "companyName",
            u.email,
            u.created_at               AS "createdAt",
            u.is_premium               AS "isPremium",
            u.premium_until            AS "premiumUntil",
            u.premium_platform         AS "premiumPlatform",
            (SELECT COUNT(*)::int FROM recipes    r WHERE r.user_id = u.id) AS "recipeCount",
            (SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) AS "ingredientCount",
            (SELECT COUNT(*)::int FROM sales      s WHERE s.user_id = u.id) AS "saleCount",
            (SELECT COALESCE(SUM(s.total_revenue),0)::float FROM sales s WHERE s.user_id = u.id) AS "totalRevenue"
          FROM users u ${where}
          ORDER BY u.created_at DESC
          LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
      ]);

      res.json({
        success: true,
        data: { users: usersRes.rows, total: countRes.rows[0].total, page, limit },
      });
    } catch (error) {
      console.error('[Admin] listUsers error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async setPremium(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { isPremium, premiumUntil } = req.body;
    try {
      await pool.query(
        `UPDATE users SET is_premium = $1, premium_until = $2, premium_platform = $3 WHERE id = $4`,
        [isPremium, premiumUntil ?? null, isPremium ? 'manual' : null, id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] setPremium error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const [userRes, salesRes] = await Promise.all([
        pool.query(
          `SELECT
            u.id,
            u.company_name              AS "companyName",
            u.email,
            u.created_at               AS "createdAt",
            u.is_premium               AS "isPremium",
            u.premium_until            AS "premiumUntil",
            u.premium_platform         AS "premiumPlatform",
            (SELECT COUNT(*)::int FROM recipes    r WHERE r.user_id = u.id) AS "recipeCount",
            (SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) AS "ingredientCount",
            (SELECT COUNT(*)::int FROM sales      s WHERE s.user_id = u.id) AS "saleCount",
            (SELECT COALESCE(SUM(s.total_revenue),0)::float FROM sales s WHERE s.user_id = u.id) AS "totalRevenue"
          FROM users u WHERE u.id = $1`,
          [id]
        ),
        pool.query(
          `SELECT s.id, r.name AS "recipeName", s.quantity_sold AS "quantitySold",
                  s.total_revenue AS "totalRevenue", s.sale_date AS "saleDate"
           FROM sales s
           LEFT JOIN recipes r ON r.id = s.recipe_id
           WHERE s.user_id = $1
           ORDER BY s.sale_date DESC LIMIT 10`,
          [id]
        ),
      ]);

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ success: true, data: { ...userRes.rows[0], recentSales: salesRes.rows } });
    } catch (error) {
      console.error('[Admin] getUser error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}
