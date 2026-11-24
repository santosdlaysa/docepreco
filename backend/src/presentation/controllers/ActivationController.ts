import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';

function positiveInteger(value: unknown, fallback: number, maximum: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback;
}

export function activationFilters(query: Request['query']) {
  const days = typeof query.days === 'string' && ['7', '30', '90'].includes(query.days) ? Number(query.days) : 30;
  const page = positiveInteger(query.page, 1, 1000000);
  const limit = positiveInteger(query.limit, 20, 50);
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 200) : '';
  // Escape LIKE metacharacters: searching for % or _ must not match every account.
  const pattern = '%' + search.replace(/[\\%_]/g, '\\$&') + '%';
  return { days, page, limit, search, pattern };
}

// A single statement keeps summary, matching count and page on one database snapshot.
// These are independent CURRENT states of accounts created in the cohort, not events.
export const ACTIVATION_REPORT_SQL = `
WITH cohort AS (
  SELECT u.id, u.company_name AS "companyName", u.email,
    u.created_at AS "createdAt", u.last_seen_at AS "lastSeenAt",
    COALESCE(u.plan_tier, 'free') AS "planTier", COALESCE(u.is_active, TRUE) AS "isActive",
    (SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) AS "ingredientCount",
    EXISTS (SELECT 1 FROM recipes r WHERE r.user_id = u.id) AS has_recipe,
    EXISTS (SELECT 1 FROM sales s WHERE s.user_id = u.id) AS has_sale
  FROM users u WHERE u.created_at >= NOW() - ($1::int * INTERVAL '1 day')
), eligible AS (
  SELECT * FROM cohort WHERE NOT has_recipe
    AND (id::text ILIKE $2 OR "companyName" ILIKE $2 OR email ILIKE $2)
), paged AS (
  SELECT id, "companyName", email, "createdAt", "lastSeenAt", "ingredientCount", "planTier", "isActive"
  FROM eligible ORDER BY "createdAt" DESC, id LIMIT $3 OFFSET $4
)
SELECT json_build_object(
  'totalAccounts', (SELECT COUNT(*)::int FROM cohort),
  'withIngredients', (SELECT COUNT(*)::int FROM cohort WHERE "ingredientCount" > 0),
  'withRecipes', (SELECT COUNT(*)::int FROM cohort WHERE has_recipe),
  'withSales', (SELECT COUNT(*)::int FROM cohort WHERE has_sale),
  'withoutRecipes', (SELECT COUNT(*)::int FROM cohort WHERE NOT has_recipe),
  'total', (SELECT COUNT(*)::int FROM eligible),
  'users', COALESCE((SELECT json_agg(p) FROM paged p), '[]'::json)
) AS data`;

export class ActivationController {
  async report(req: Request, res: Response): Promise<void> {
    const { days, page, limit, pattern } = activationFilters(req.query);
    try {
      const result = await pool.query(ACTIVATION_REPORT_SQL, [days, pattern, limit, (page - 1) * limit]);
      res.json({ success: true, data: { ...result.rows[0].data, days, page, limit } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao consultar ativação. Tente novamente.' });
    }
  }
}
