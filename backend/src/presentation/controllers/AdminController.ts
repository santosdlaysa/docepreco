import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { sendBulkUpdateEmail } from '../../infrastructure/services/emailService';

export class AdminController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [statsRes, topRevenueRes, topActivityRes, premiumSubsRes] = await Promise.all([
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
        pool.query(`
          SELECT
            u.id,
            u.company_name   AS "companyName",
            u.email,
            u.premium_platform AS "premiumPlatform",
            u.premium_until    AS "premiumUntil"
          FROM users u
          WHERE u.is_premium = TRUE
          ORDER BY u.premium_until ASC NULLS LAST
        `),
      ]);

      res.json({
        success: true,
        data: {
          ...statsRes.rows[0],
          topByRevenue: topRevenueRes.rows,
          topByActivity: topActivityRes.rows,
          premiumSubscribers: premiumSubsRes.rows,
        },
      });
    } catch (error) {
      console.error('[Admin] getStats error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const isPremiumFilter = req.query.isPremium;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const offset = (page - 1) * limit;

    const SORT_MAP: Record<string, string> = {
      createdAt:       'u.created_at DESC',
      recipeCount:     '"recipeCount" DESC',
      ingredientCount: '"ingredientCount" DESC',
      saleCount:       '"saleCount" DESC',
      totalRevenue:    '"totalRevenue" DESC',
    };
    const orderBy = SORT_MAP[sortBy] ?? 'u.created_at DESC';

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
          ORDER BY ${orderBy}
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
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
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
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
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
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getRequestLogs(req: Request, res: Response): Promise<void> {
    const limit = Math.min(500, parseInt((req.query.limit as string) || '200'));
    const method = req.query.method as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (method) { conditions.push(`method = $${idx++}`); params.push(method); }
    if (search) { conditions.push(`path ILIKE $${idx++}`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `SELECT id, method, path, status_code AS "statusCode", duration_ms AS "durationMs", ip, error_message AS "errorMessage", ts
         FROM request_logs ${where}
         ORDER BY ts DESC LIMIT $${idx}`,
        [...params, limit]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Admin] getRequestLogs error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getLogs(req: Request, res: Response): Promise<void> {
    const limit = Math.min(100, parseInt((req.query.limit as string) || '50'));
    try {
      const result = await pool.query(`
        SELECT type, label, detail, ts FROM (
          SELECT
            'new_user'           AS type,
            u.company_name       AS label,
            u.email              AS detail,
            u.created_at         AS ts
          FROM users u

          UNION ALL

          SELECT
            'sale'               AS type,
            r.name               AS label,
            u.company_name       AS detail,
            s.created_at         AS ts
          FROM sales s
          JOIN users u ON u.id = s.user_id
          LEFT JOIN recipes r ON r.id = s.recipe_id

          UNION ALL

          SELECT
            CASE WHEN u.is_premium THEN 'premium_on' ELSE 'premium_off' END AS type,
            u.company_name       AS label,
            COALESCE(u.premium_platform, 'manual') AS detail,
            u.created_at         AS ts
          FROM users u
          WHERE u.is_premium = TRUE AND u.premium_platform IS NOT NULL
        ) events
        ORDER BY ts DESC
        LIMIT $1
      `, [limit]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Admin] getLogs error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async sendUpdateEmail(_req: Request, res: Response): Promise<void> {
    try {
      const result = await sendBulkUpdateEmail();
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Admin] sendUpdateEmail error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}
