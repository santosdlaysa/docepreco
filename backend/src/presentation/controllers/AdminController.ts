import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../../infrastructure/database/connection';
import { sendBulkUpdateEmail } from '../../infrastructure/services/emailService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { UpdateIngredientUseCase } from '../../application/use-cases/ingredient/UpdateIngredientUseCase';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { UpdateRecipeUseCase } from '../../application/use-cases/recipe/UpdateRecipeUseCase';
import { PostgresRecipeRepository } from '../../infrastructure/repositories/PostgresRecipeRepository';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';

const userRepo = new PostgresUserRepository();

export class AdminController {
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [statsRes, topRevenueRes, topActivityRes, premiumSubsRes, recentUsersRes] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users)                                                        AS "totalUsers",
            (SELECT COUNT(*)::int FROM users WHERE is_premium = TRUE)                               AS "premiumUsers",
            (SELECT COUNT(*)::int FROM users WHERE is_premium = TRUE AND plan_tier = 'master')      AS "masterUsers",
            (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days')         AS "newUsersWeek",
            (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '1 day')          AS "newUsersToday",
            (SELECT COUNT(*)::int FROM users WHERE created_at >= date_trunc('month', NOW()))     AS "newUsersMonth",
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
            u.premium_until    AS "premiumUntil",
            u.plan_tier        AS "planTier"
          FROM users u
          WHERE u.is_premium = TRUE OR (u.premium_until IS NOT NULL AND u.premium_until < NOW())
          ORDER BY u.premium_until ASC NULLS LAST
        `),
        pool.query(`
          SELECT
            u.id,
            u.company_name AS "companyName",
            u.email,
            u.is_premium   AS "isPremium",
            u.created_at   AS "createdAt"
          FROM users u
          ORDER BY u.created_at DESC
          LIMIT 10
        `),
      ]);

      res.json({
        success: true,
        data: {
          ...statsRes.rows[0],
          topByRevenue: topRevenueRes.rows,
          topByActivity: topActivityRes.rows,
          premiumSubscribers: premiumSubsRes.rows,
          recentUsers: recentUsersRes.rows,
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
    const signupPlatform = req.query.signupPlatform as string | undefined;
    const hasPhone = req.query.hasPhone as string | undefined;
    const hasInstagram = req.query.hasInstagram as string | undefined;
    const minRecipes = req.query.minRecipes ? parseInt(req.query.minRecipes as string) : undefined;
    const minIngredients = req.query.minIngredients ? parseInt(req.query.minIngredients as string) : undefined;
    const minSales = req.query.minSales ? parseInt(req.query.minSales as string) : undefined;
    const minRevenue = req.query.minRevenue ? parseFloat(req.query.minRevenue as string) : undefined;
    const lastSeenDays = req.query.lastSeenDays ? parseInt(req.query.lastSeenDays as string) : undefined;
    const createdDays = req.query.createdDays ? parseInt(req.query.createdDays as string) : undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const offset = (page - 1) * limit;

    const SORT_MAP: Record<string, string> = {
      createdAt:       'u.created_at DESC',
      recipeCount:     '"recipeCount" DESC',
      ingredientCount: '"ingredientCount" DESC',
      saleCount:       '"saleCount" DESC',
      totalRevenue:    '"totalRevenue" DESC',
      lastSeenAt:      'u.last_seen_at DESC NULLS LAST',
    };
    const orderBy = SORT_MAP[sortBy] ?? 'u.created_at DESC';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.company_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.instagram_handle ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (isPremiumFilter === 'true') conditions.push(`u.is_premium = TRUE`);
    else if (isPremiumFilter === 'false') conditions.push(`u.is_premium = FALSE`);
    if (signupPlatform === 'ios' || signupPlatform === 'android') {
      conditions.push(`u.signup_platform = $${idx}`);
      params.push(signupPlatform);
      idx++;
    }
    if (hasPhone === 'true') conditions.push(`u.phone IS NOT NULL AND u.phone != ''`);
    else if (hasPhone === 'false') conditions.push(`(u.phone IS NULL OR u.phone = '')`);
    if (hasInstagram === 'true') conditions.push(`u.instagram_handle IS NOT NULL AND u.instagram_handle != ''`);
    else if (hasInstagram === 'false') conditions.push(`(u.instagram_handle IS NULL OR u.instagram_handle = '')`);
    if (lastSeenDays !== undefined && lastSeenDays > 0) {
      conditions.push(`u.last_seen_at >= NOW() - INTERVAL '${lastSeenDays} days'`);
    } else if (lastSeenDays === 0) {
      conditions.push(`u.last_seen_at IS NULL`);
    }
    if (createdDays !== undefined && createdDays > 0) {
      conditions.push(`u.created_at >= NOW() - INTERVAL '${createdDays} days'`);
    }
    if (minRecipes !== undefined && minRecipes > 0) {
      conditions.push(`(SELECT COUNT(*)::int FROM recipes r WHERE r.user_id = u.id) >= ${minRecipes}`);
    }
    if (minIngredients !== undefined && minIngredients > 0) {
      conditions.push(`(SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) >= ${minIngredients}`);
    }
    if (minSales !== undefined && minSales > 0) {
      conditions.push(`(SELECT COUNT(*)::int FROM sales s WHERE s.user_id = u.id) >= ${minSales}`);
    }
    if (minRevenue !== undefined && minRevenue > 0) {
      conditions.push(`(SELECT COALESCE(SUM(s.total_revenue),0)::float FROM sales s WHERE s.user_id = u.id) >= ${minRevenue}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const [countRes, usersRes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params),
        pool.query(
          `SELECT
            u.id,
            u.company_name              AS "companyName",
            u.email,
            u.phone,
            u.created_at               AS "createdAt",
            u.is_premium               AS "isPremium",
            u.plan_tier                AS "planTier",
            u.premium_until            AS "premiumUntil",
            u.premium_platform         AS "premiumPlatform",
            u.signup_platform          AS "signupPlatform",
            u.last_seen_at             AS "lastSeenAt",
            u.instagram_handle         AS "instagramHandle",
            COALESCE(u.is_active, TRUE) AS "isActive",
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
    const { isPremium, premiumUntil, planTier } = req.body as {
      isPremium?: boolean;
      premiumUntil?: string | null;
      planTier?: 'premium' | 'master';
    };

    if (typeof isPremium !== 'boolean') {
      res.status(400).json({ error: 'isPremium boolean required' });
      return;
    }
    try {
      const until = premiumUntil ? new Date(premiumUntil) : null;
      const tier = isPremium ? (planTier === 'master' ? 'master' : 'premium') : 'free';
      const user = await userRepo.updatePlanTier(id, tier, until, isPremium ? 'manual' : null);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      res.json({
        success: true,
        data: {
          isPremium: user.isPremium,
          planTier: user.planTier,
          premiumUntil: user.premiumUntil,
          premiumPlatform: user.premiumPlatform,
        },
      });
    } catch (error) {
      console.error('[Admin] setPremium error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async setSignupPlatform(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { signupPlatform } = req.body as { signupPlatform?: 'ios' | 'android' | null };

    if (signupPlatform !== 'ios' && signupPlatform !== 'android' && signupPlatform !== null) {
      res.status(400).json({ error: 'signupPlatform deve ser ios, android ou null' });
      return;
    }

    try {
      const result = await pool.query(
        `UPDATE users
         SET signup_platform = $1
         WHERE id = $2
         RETURNING signup_platform AS "signupPlatform"`,
        [signupPlatform, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[Admin] setSignupPlatform error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async toggleUserActive(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const result = await pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING is_active AS "isActive"`,
        [isActive, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      res.json({ success: true, data: { isActive: result.rows[0].isActive } });
    } catch (error) {
      console.error('[Admin] toggleUserActive error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async grantTrial(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { days, notificationTitle, notificationBody, planTier } = req.body as {
      days?: number;
      notificationTitle?: string;
      notificationBody?: string;
      planTier?: 'premium' | 'master';
    };

    if (!days || days <= 0) {
      res.status(400).json({ success: false, error: 'days é obrigatório e deve ser maior que 0' });
      return;
    }
    if (!notificationTitle || !notificationBody) {
      res.status(400).json({ success: false, error: 'notificationTitle e notificationBody são obrigatórios' });
      return;
    }

    try {
      const userRes = await pool.query('SELECT id, company_name FROM users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      const tier: 'premium' | 'master' = planTier === 'master' ? 'master' : 'premium';
      const until = new Date();
      until.setDate(until.getDate() + days);
      const premiumUntil = until.toISOString();

      const updatedUser = await userRepo.updatePlanTier(id, tier, new Date(premiumUntil), 'manual');
      if (!updatedUser) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      // Send push notification to this specific user
      const tokenRepo = new PostgresPushTokenRepository();
      const tokens = await tokenRepo.findByUserId(id);
      let recipientsCount = 0;
      if (tokens.length > 0) {
        const tokenStrings = tokens.map(t => t.token);
        recipientsCount = await sendPushNotifications(
          tokenStrings,
          notificationTitle,
          notificationBody,
          { type: 'trial_granted', days }
        );
      }

      res.json({
        success: true,
        data: {
          premiumUntil,
          planTier: tier,
          notificationSent: recipientsCount > 0,
          recipientsCount,
        },
      });
    } catch (error) {
      console.error('[Admin] grantTrial error:', error);
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
            u.phone,
            u.created_at               AS "createdAt",
            u.is_premium               AS "isPremium",
            u.plan_tier                AS "planTier",
            u.premium_until            AS "premiumUntil",
            u.premium_platform         AS "premiumPlatform",
            u.signup_platform          AS "signupPlatform",
            u.last_seen_at             AS "lastSeenAt",
            u.instagram_handle         AS "instagramHandle",
            COALESCE(u.is_active, TRUE) AS "isActive",
            (SELECT COUNT(*)::int FROM recipes    r WHERE r.user_id = u.id) AS "recipeCount",
            (SELECT COUNT(*)::int FROM ingredients i WHERE i.user_id = u.id) AS "ingredientCount",
            (SELECT COUNT(*)::int FROM sales      s WHERE s.user_id = u.id) AS "saleCount",
            (SELECT COALESCE(SUM(s.total_revenue),0)::float FROM sales s WHERE s.user_id = u.id) AS "totalRevenue",
            ss.store_name              AS "storeName",
            ss.slug                    AS "storeSlug",
            ss.active                  AS "storeActive",
            ss.description             AS "storeDescription",
            ss.accepts_delivery        AS "storeAcceptsDelivery",
            ss.accepts_pickup          AS "storeAcceptsPickup",
            ss.min_order_value::float  AS "storeMinOrderValue",
            ss.delivery_fee::float     AS "storeDeliveryFee",
            ss.cover_image_url         AS "storeCoverImageUrl",
            (SELECT COUNT(*)::int FROM store_products sp WHERE sp.user_id = u.id) AS "storeProductCount"
          FROM users u
          LEFT JOIN store_settings ss ON ss.user_id = u.id
          WHERE u.id = $1`,
          [id]
        ),
        pool.query(
          `SELECT s.id, COALESCE(r.name, s.product_name) AS "recipeName", s.quantity_sold AS "quantitySold",
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
        `SELECT id, method, path, status_code AS "statusCode", duration_ms AS "durationMs", ip, error_message AS "errorMessage", body_email AS "bodyEmail", request_body AS "requestBody", response_body AS "responseBody", ts
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
            COALESCE(r.name, s.product_name) AS label,
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

          UNION ALL

          SELECT
            'pix_request'        AS type,
            u.company_name       AS label,
            pr.plan_label || ' - ' || CASE WHEN pr.status = 'pending' THEN 'Pendente' WHEN pr.status = 'approved' THEN 'Aprovado' ELSE 'Rejeitado' END AS detail,
            pr.created_at        AS ts
          FROM pix_requests pr
          JOIN users u ON u.id = pr.user_id

          UNION ALL

          SELECT
            'suggestion'         AS type,
            sg.user_name         AS label,
            LEFT(sg.message, 80) AS detail,
            sg.created_at        AS ts
          FROM suggestions sg
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

  async getDailyRegistrationGoal(req: Request, res: Response): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT value FROM app_settings WHERE key = 'daily_registration_goal'`
      );
      const goal = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;
      const todayRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`
      );
      res.json({ success: true, data: { goal, registeredToday: todayRes.rows[0].count } });
    } catch (error) {
      console.error('[Admin] getDailyRegistrationGoal error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async setDailyRegistrationGoal(req: Request, res: Response): Promise<void> {
    const { goal } = req.body ?? {};
    const parsed = Number(goal);
    if (!Number.isInteger(parsed) || parsed < 0) {
      res.status(400).json({ error: 'Meta inválida' });
      return;
    }
    try {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('daily_registration_goal', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [String(parsed)]
      );
      res.json({ success: true, data: { goal: parsed } });
    } catch (error) {
      console.error('[Admin] setDailyRegistrationGoal error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getUserData(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const [userRes, recipesRes, ingredientsRes, salesRes] = await Promise.all([
        pool.query(
          `SELECT u.id, u.company_name AS "companyName", u.email,
                  u.created_at AS "createdAt", u.is_premium AS "isPremium",
                  u.premium_until AS "premiumUntil", u.premium_platform AS "premiumPlatform",
                  u.last_seen_at AS "lastSeenAt"
           FROM users u WHERE u.id = $1`,
          [id]
        ),
        pool.query(
          `SELECT r.id, r.name, r.yield::int, r.profit_margin::float AS "profitMargin",
                  r.created_at AS "createdAt", r.updated_at AS "updatedAt",
                  (SELECT COUNT(*)::int FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS "ingredientCount",
                  0::float AS "totalCost"
           FROM recipes r WHERE r.user_id = $1
           ORDER BY r.updated_at DESC`,
          [id]
        ),
        pool.query(
          `SELECT i.id, i.name,
                  i.purchase_price::float AS "purchasePrice",
                  i.purchase_quantity::float AS "purchaseQuantity",
                  i.purchase_price::float AS "price",
                  i.purchase_quantity::float AS "packageAmount",
                  i.unit,
                  i.purchase_unit_label AS "purchaseUnitLabel",
                  i.purchase_unit_weight::float AS "purchaseUnitWeight",
                  i.created_at AS "createdAt",
                  i.updated_at AS "updatedAt",
                  (SELECT COUNT(*)::int FROM recipe_ingredients ri WHERE ri.ingredient_id = i.id) AS "usedInRecipes"
           FROM ingredients i WHERE i.user_id = $1
           ORDER BY i.name ASC`,
          [id]
        ),
        pool.query(
          `SELECT s.id, COALESCE(r.name, s.product_name) AS "recipeName", s.quantity_sold::int AS "quantitySold",
                  s.sale_price::float AS "salePrice", s.total_revenue::float AS "totalRevenue",
                  s.sale_date AS "saleDate", s.notes, s.created_at AS "createdAt"
           FROM sales s
           LEFT JOIN recipes r ON r.id = s.recipe_id
           WHERE s.user_id = $1
           ORDER BY s.sale_date DESC
           LIMIT 100`,
          [id]
        ),
      ]);

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Fetch ingredients and additional costs for each recipe
      const recipeIds = recipesRes.rows.map((r: any) => r.id);
      let recipeIngredientsMap: Record<string, any[]> = {};
      let recipeAdditionalCostsMap: Record<string, any[]> = {};
      let recipeSubRecipesMap: Record<string, any[]> = {};
      let recipeIngredientCostsMap: Record<string, number> = {};
      let recipeAdditionalCostsTotalMap: Record<string, number> = {};
      let recipeBaseQuantityProducedMap: Record<string, number> = {};
      if (recipeIds.length > 0) {
        const [riRes, acRes, srRes] = await Promise.all([
          pool.query(
            `SELECT ri.recipe_id AS "recipeId", ri.ingredient_id AS "ingredientId", i.name,
                    ri.quantity_used::float AS "quantityUsed", ri.unit,
                    i.purchase_price::float AS "purchasePrice",
                    i.purchase_quantity::float AS "purchaseQuantity",
                    i.unit AS "purchaseUnit",
                    i.purchase_unit_weight::float AS "purchaseUnitWeight"
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.id = ri.ingredient_id
             WHERE ri.recipe_id = ANY($1)
             ORDER BY i.name ASC`,
            [recipeIds]
          ),
          pool.query(
            `SELECT recipe_id AS "recipeId", name, value::float
             FROM recipe_additional_costs
             WHERE recipe_id = ANY($1)
             ORDER BY name ASC`,
            [recipeIds]
          ),
          pool.query(
            `SELECT sr.recipe_id AS "recipeId", sr.sub_recipe_id AS "subRecipeId",
                    r.name AS "subRecipeName", r.yield::float AS "yield",
                    sr.quantity_used::float AS "quantityUsed", sr.unit
             FROM recipe_sub_recipes sr
             JOIN recipes r ON r.id = sr.sub_recipe_id
             WHERE sr.recipe_id = ANY($1)
             ORDER BY r.name ASC`,
            [recipeIds]
          ),
        ]);
        for (const row of riRes.rows) {
          if (!recipeIngredientsMap[row.recipeId]) recipeIngredientsMap[row.recipeId] = [];
          recipeIngredientsMap[row.recipeId].push({ ingredientId: row.ingredientId, name: row.name, quantityUsed: row.quantityUsed, unit: row.unit });

          const purchaseQuantity = Number(row.purchaseQuantity) || 0;
          const purchaseUnitWeight = Number(row.purchaseUnitWeight) || 0;
          const effectivePurchaseQuantity = purchaseUnitWeight > 0
            ? purchaseQuantity * purchaseUnitWeight
            : purchaseQuantity;
          if (effectivePurchaseQuantity <= 0) continue;

          const usedQuantity = this.convertAdminRecipeQuantity(
            Number(row.quantityUsed) || 0,
            row.unit,
            row.purchaseUnit,
            purchaseUnitWeight
          );
          const ingredientCost = usedQuantity * ((Number(row.purchasePrice) || 0) / effectivePurchaseQuantity);
          recipeIngredientCostsMap[row.recipeId] = (recipeIngredientCostsMap[row.recipeId] ?? 0) + ingredientCost;

          const baseQuantity = this.normalizeAdminBaseMeasure(usedQuantity, row.purchaseUnit);
          if (baseQuantity !== undefined) {
            recipeBaseQuantityProducedMap[row.recipeId] = (recipeBaseQuantityProducedMap[row.recipeId] ?? 0) + baseQuantity;
          }
        }
        for (const row of acRes.rows) {
          if (!recipeAdditionalCostsMap[row.recipeId]) recipeAdditionalCostsMap[row.recipeId] = [];
          recipeAdditionalCostsMap[row.recipeId].push({ name: row.name, value: row.value });
          recipeAdditionalCostsTotalMap[row.recipeId] = (recipeAdditionalCostsTotalMap[row.recipeId] ?? 0) + (Number(row.value) || 0);
        }
        for (const row of srRes.rows) {
          if (!recipeSubRecipesMap[row.recipeId]) recipeSubRecipesMap[row.recipeId] = [];
          recipeSubRecipesMap[row.recipeId].push({
            subRecipeId: row.subRecipeId,
            subRecipeName: row.subRecipeName,
            yield: row.yield,
            quantityUsed: row.quantityUsed,
            unit: row.unit || 'un',
          });
        }
      }

      const directRecipeTotals = new Map<string, number>();
      for (const r of recipesRes.rows) {
        directRecipeTotals.set(
          r.id,
          (recipeIngredientCostsMap[r.id] ?? 0) + (recipeAdditionalCostsTotalMap[r.id] ?? 0)
        );
      }

      const getRecipeTotal = (recipeId: string, seen = new Set<string>()): number => {
        if (seen.has(recipeId)) return directRecipeTotals.get(recipeId) ?? 0;
        const nextSeen = new Set(seen);
        nextSeen.add(recipeId);

        const subRecipesCost = (recipeSubRecipesMap[recipeId] ?? []).reduce((sum, sub) => {
          const subTotalCost = getRecipeTotal(sub.subRecipeId, nextSeen);
          const subQuantityUsed = Number(sub.quantityUsed) || 0;
          if (sub.unit === 'un' || sub.unit === 'unit') {
            const subCostPerUnit = subTotalCost / Math.max(Number(sub.yield) || 1, 1);
            return sum + subCostPerUnit * subQuantityUsed;
          }

          const baseQuantityUsed = this.normalizeAdminBaseMeasure(subQuantityUsed, sub.unit);
          const baseQuantityProduced = recipeBaseQuantityProducedMap[sub.subRecipeId] ?? 0;
          if (baseQuantityUsed === undefined || baseQuantityProduced <= 0) return sum;
          return sum + (subTotalCost / baseQuantityProduced) * baseQuantityUsed;
        }, 0);

        return (directRecipeTotals.get(recipeId) ?? 0) + subRecipesCost;
      };

      const recipesWithIngredients = recipesRes.rows.map((r: any) => ({
        ...r,
        totalCost: getRecipeTotal(r.id),
        ingredients: recipeIngredientsMap[r.id] ?? [],
        additionalCosts: recipeAdditionalCostsMap[r.id] ?? [],
        subRecipes: recipeSubRecipesMap[r.id] ?? [],
      }));

      res.json({
        success: true,
        data: {
          user: userRes.rows[0],
          recipes: recipesWithIngredients,
          ingredients: ingredientsRes.rows,
          sales: salesRes.rows,
        },
      });
    } catch (error) {
      console.error('[Admin] getUserData error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async updateUserIngredient(req: Request, res: Response): Promise<void> {
    const { id, ingredientId } = req.params;
    try {
      const repo = new PostgresIngredientRepository();
      const useCase = new UpdateIngredientUseCase(repo);
      await useCase.execute(ingredientId, req.body, id);
      const updated = await pool.query(
        `SELECT i.id, i.name,
                i.purchase_price::float AS "purchasePrice",
                i.purchase_quantity::float AS "purchaseQuantity",
                i.purchase_price::float AS "price",
                i.purchase_quantity::float AS "packageAmount",
                i.unit,
                i.purchase_unit_label AS "purchaseUnitLabel",
                i.purchase_unit_weight::float AS "purchaseUnitWeight",
                i.created_at AS "createdAt",
                i.updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM recipe_ingredients ri WHERE ri.ingredient_id = i.id) AS "usedInRecipes"
         FROM ingredients i
         WHERE i.id = $1 AND i.user_id = $2`,
        [ingredientId, id]
      );
      res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'Ingredient not found') {
        res.status(404).json({ success: false, error: 'Ingrediente não encontrado' });
        return;
      }
      if (message.includes('already exists')) {
        res.status(400).json({ success: false, error: 'Já existe um ingrediente com esse nome para este usuário' });
        return;
      }
      console.error('[Admin] updateUserIngredient error:', error);
      res.locals.errorMessage = message;
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async updateUserRecipe(req: Request, res: Response): Promise<void> {
    const { id, recipeId } = req.params;
    try {
      const repo = new PostgresRecipeRepository();
      const useCase = new UpdateRecipeUseCase(repo);
      const recipe = await useCase.execute(recipeId, req.body, id);
      res.json({ success: true, data: recipe });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'Recipe not found') {
        res.status(404).json({ success: false, error: 'Receita não encontrada' });
        return;
      }
      if (message.includes('already exists')) {
        res.status(400).json({ success: false, error: 'Já existe uma receita com esse nome para este usuário' });
        return;
      }
      console.error('[Admin] updateUserRecipe error:', error);
      res.locals.errorMessage = message;
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async resetUserPassword(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newPassword } = req.body ?? {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres' });
      return;
    }

    try {
      const userRes = await pool.query('SELECT id, email, company_name FROM users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] resetUserPassword error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async sendUpdateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { subject, intro, features, ctaText, ctaUrl } = req.body ?? {};
      const content = (subject || intro || features || ctaText || ctaUrl)
        ? { subject, intro, features, ctaText, ctaUrl }
        : undefined;
      const result = await sendBulkUpdateEmail(content);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Admin] sendUpdateEmail error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  /**
   * Admin define/edita manualmente o valor pago de um evento de assinatura.
   * Útil para pagamentos antigos cujo valor o sistema não capturou (ex.: anual
   * de loja). Aceita amountCents inteiro (>= 0) ou null para limpar.
   * PATCH /api/admin/premium-events/:id
   */
  async updatePremiumEventAmount(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { amountCents } = req.body as { amountCents?: number | null };

    if (amountCents != null && (!Number.isInteger(amountCents) || amountCents < 0)) {
      res.status(400).json({ success: false, error: 'amountCents deve ser um inteiro >= 0 ou null' });
      return;
    }

    try {
      const result = await pool.query(
        `UPDATE premium_events SET amount_cents = $2 WHERE id = $1 RETURNING id`,
        [id, amountCents ?? null]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Evento não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] updatePremiumEventAmount error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getPremiumHistory(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT id, event_type AS "eventType", source, platform, product_id AS "productId",
                expiration_at AS "expirationAt", store, amount_cents AS "amountCents", currency,
                created_at AS "createdAt"
         FROM premium_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('[Admin] getPremiumHistory error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async getSubscriptionDashboard(req: Request, res: Response): Promise<void> {
    try {
      const [overviewRes, byPlatformRes, eventsRes, timeseriesRes] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(DISTINCT id)::int FROM users WHERE is_premium = TRUE AND (premium_until IS NULL OR premium_until > NOW())) AS "activeSubscribers",
            (SELECT COUNT(*)::int FROM premium_events WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE') AND (expiration_at IS NULL OR expiration_at > NOW())) AS "totalActiveEvents",
            (SELECT COUNT(DISTINCT id)::int FROM users WHERE is_premium = TRUE AND premium_until IS NOT NULL AND premium_until > NOW() AND premium_until <= NOW() + INTERVAL '7 days') AS "expiringSubscribers",
            (SELECT COUNT(DISTINCT id)::int FROM users WHERE is_premium = TRUE AND premium_until IS NOT NULL AND premium_until <= NOW()) AS "expiredSubscribers",
            (SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0)::bigint FROM premium_events WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE')) AS "totalReceivedCents",
            (SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0)::bigint FROM premium_events WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE') AND created_at >= DATE_TRUNC('month', NOW())) AS "monthlyReceivedCents",
            (SELECT COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0)::bigint FROM premium_events WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE') AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW())) AS "lastMonthCents",
            (SELECT COALESCE(AVG(amount_cents), 0)::float FROM premium_events WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE') AND amount_cents > 0) AS "avgValue",
            (SELECT COUNT(DISTINCT id)::int FROM users WHERE is_premium = TRUE) AS "totalSubscribers"
        `),
        pool.query(`
          SELECT
            COALESCE(pe.platform, 'unknown') AS platform,
            COUNT(DISTINCT pe.user_id)::int AS "subscriberCount",
            COUNT(*)::int AS "eventCount",
            COALESCE(SUM(CASE WHEN pe.amount_cents > 0 THEN pe.amount_cents ELSE 0 END), 0)::bigint AS "totalCents",
            COALESCE(AVG(CASE WHEN pe.amount_cents > 0 THEN pe.amount_cents ELSE NULL END), 0)::float AS "avgCents"
          FROM premium_events pe
          WHERE pe.event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE')
          GROUP BY pe.platform
          ORDER BY "totalCents" DESC
        `),
        pool.query(`
          SELECT
            pe.id,
            pe.user_id AS "userId",
            u.company_name AS "companyName",
            u.email,
            pe.platform,
            pe.store,
            pe.product_id AS "productId",
            pe.amount_cents AS "amountCents",
            pe.expiration_at AS "expirationAt",
            pe.event_type AS "eventType",
            pe.created_at AS "createdAt"
          FROM premium_events pe
          JOIN users u ON u.id = pe.user_id
          WHERE pe.event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE')
          ORDER BY pe.created_at DESC
        `),
        pool.query(`
          SELECT
            DATE_TRUNC('day', pe.created_at)::date AS "date",
            COALESCE(SUM(CASE WHEN pe.amount_cents > 0 THEN pe.amount_cents ELSE 0 END), 0)::bigint AS "totalCents",
            COUNT(*)::int AS "eventCount",
            COUNT(DISTINCT pe.user_id)::int AS "uniqueUsers"
          FROM premium_events pe
          WHERE pe.event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE')
            AND pe.created_at >= NOW() - INTERVAL '90 days'
          GROUP BY DATE_TRUNC('day', pe.created_at)
          ORDER BY "date" ASC
        `)
      ]);

      const overview = overviewRes.rows[0];
      const byPlatform = byPlatformRes.rows;
      const events = eventsRes.rows;
      const timeseries = timeseriesRes.rows;

      const activeSubscribers = parseInt(overview.activeSubscribers || '0');
      const totalReceivedCents = parseInt(overview.totalReceivedCents || '0');
      const monthlyReceivedCents = parseInt(overview.monthlyReceivedCents || '0');
      const lastMonthCents = parseInt(overview.lastMonthCents || '0');

      const mrr = activeSubscribers > 0 ? monthlyReceivedCents / activeSubscribers / 100 : 0;
      const arr = activeSubscribers > 0 ? (monthlyReceivedCents * 12) / activeSubscribers / 100 : 0;
      const momGrowth = lastMonthCents > 0 ? ((monthlyReceivedCents - lastMonthCents) / lastMonthCents) * 100 : 0;

      res.json({
        success: true,
        data: {
          overview: {
            activeSubscribers,
            expiringSubscribers: parseInt(overview.expiringSubscribers || '0'),
            expiredSubscribers: parseInt(overview.expiredSubscribers || '0'),
            totalSubscribers: parseInt(overview.totalSubscribers || '0'),
            totalReceivedBRL: totalReceivedCents / 100,
            monthlyReceivedBRL: monthlyReceivedCents / 100,
            lastMonthBRL: lastMonthCents / 100,
            avgValueBRL: overview.avgValue || 0,
            mrr,
            arr,
            momGrowth
          },
          byPlatform: byPlatform.map(row => ({
            platform: row.platform,
            subscriberCount: parseInt(row.subscriberCount),
            eventCount: parseInt(row.eventCount),
            totalBRL: parseInt(row.totalCents) / 100,
            avgBRL: row.avgCents / 100
          })),
          recentEvents: events.map(row => ({
            id: row.id,
            userId: row.userId,
            companyName: row.companyName,
            email: row.email,
            platform: row.platform,
            store: row.store,
            productId: row.productId,
            amountBRL: (parseInt(row.amountCents) || 0) / 100,
            expirationAt: row.expirationAt,
            eventType: row.eventType,
            createdAt: row.createdAt
          })),
          timeseries: timeseries.map(row => ({
            date: row.date,
            totalBRL: parseInt(row.totalCents) / 100,
            eventCount: parseInt(row.eventCount),
            uniqueUsers: parseInt(row.uniqueUsers)
          }))
        }
      });
    } catch (error) {
      console.error('[Admin] getSubscriptionDashboard error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async executeQuery(req: Request, res: Response): Promise<void> {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      res.status(400).json({ error: 'Campo "sql" é obrigatório' });
      return;
    }
    const start = Date.now();
    try {
      console.log(`[Admin DB] query: ${sql.slice(0, 200)}`);
      const result = await pool.query(sql);
      const ms = Date.now() - start;
      res.json({
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount ?? 0,
          command: result.command,
          fields: result.fields?.map(f => f.name) ?? [],
          ms,
        },
      });
    } catch (error: any) {
      const ms = Date.now() - start;
      console.error('[Admin DB] query error:', error?.message);
      res.status(400).json({
        success: false,
        error: error?.message ?? 'Erro ao executar query',
        ms,
      });
    }
  }

  private convertAdminRecipeQuantity(quantity: number, fromUnit: string, toUnit: string, purchaseUnitWeight: number): number {
    if (fromUnit === 'unit' && toUnit !== 'unit' && purchaseUnitWeight > 0) return quantity * purchaseUnitWeight;
    if (fromUnit === toUnit) return quantity;
    if (fromUnit === 'g' && toUnit === 'kg') return quantity / 1000;
    if (fromUnit === 'kg' && toUnit === 'g') return quantity * 1000;
    if (fromUnit === 'ml' && toUnit === 'l') return quantity / 1000;
    if (fromUnit === 'l' && toUnit === 'ml') return quantity * 1000;
    return quantity;
  }

  private normalizeAdminBaseMeasure(quantity: number, unit: string): number | undefined {
    if (unit === 'g' || unit === 'ml') return quantity;
    if (unit === 'kg' || unit === 'l') return quantity * 1000;
    return undefined;
  }
}
