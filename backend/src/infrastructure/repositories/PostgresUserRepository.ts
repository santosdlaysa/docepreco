import { pool } from '../database/connection';
import { User, RegisterDTO, PremiumPlatform, PlanTier } from '../../domain/entities/User';
import bcrypt from 'bcryptjs';

// The `users.id` column is a UUID. RevenueCat webhooks may pass non-UUID
// identifiers (e.g. "$RCAnonymousID:...") as app_user_id/original_app_user_id/
// aliases. Querying a UUID column with such a value makes Postgres throw
// "invalid input syntax for type uuid", which previously turned every such
// webhook into a 500. Guard lookups so a non-UUID simply returns null.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostgresUserRepository {
  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    if (!UUID_RE.test(id)) return null;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByIdFull(id: string): Promise<(User & { passwordHash: string }) | null> {
    if (!UUID_RE.test(id)) return null;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(data: RegisterDTO): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const phone = data.phone?.replace(/\D/g, '') || null;
    const result = await pool.query(
      `INSERT INTO users (company_name, email, password_hash, phone, signup_platform) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.companyName, data.email.toLowerCase(), passwordHash, phone, data.platform || null]
    );
    return this.mapRow(result.rows[0]);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async updateInstagramHandle(userId: string, instagramHandle: string | null): Promise<(User & { passwordHash: string }) | null> {
    const result = await pool.query(
      `UPDATE users SET instagram_handle = $2 WHERE id = $1 RETURNING *`,
      [userId, instagramHandle]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async updatePhone(userId: string, phone: string | null): Promise<(User & { passwordHash: string }) | null> {
    const result = await pool.query(
      `UPDATE users SET phone = $2 WHERE id = $1 RETURNING *`,
      [userId, phone]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Sets the user's plan tier explicitly. Use this for tier-aware callers
   * (RevenueCat webhook, referral reward, PIX-by-tier). Granting a paid tier
   * never regresses premium_until to an earlier date (GREATEST), preventing
   * out-of-order webhooks from shortening a paid period. tier='free' revokes.
   */
  async updatePlanTier(
    userId: string,
    tier: PlanTier,
    until: Date | null,
    platform: PremiumPlatform | null
  ): Promise<User | null> {
    let result;
    if (tier === 'free') {
      result = await pool.query(
        `UPDATE users
           SET is_premium = FALSE, plan_tier = 'free', premium_until = $2, premium_platform = $3
           WHERE id = $1
           RETURNING *`,
        [userId, until, platform]
      );
    } else {
      const untilExpr = until ? `GREATEST(premium_until, $3)` : `$3`;
      result = await pool.query(
        `UPDATE users
           SET is_premium = TRUE, plan_tier = $2, premium_until = ${untilExpr}, premium_platform = $4
           WHERE id = $1
           RETURNING *`,
        [userId, tier, until, platform]
      );
    }
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Backward-compatible binary premium toggle. Kept for callers that don't
   * know about tiers yet (mobile /premium/sync, admin manual toggle, PIX).
   * Granting premium NEVER downgrades an existing master (CASE guard) — only
   * the explicit updatePlanTier / a revocation can change a master tier.
   */
  async updatePremiumStatus(
    userId: string,
    isPremium: boolean,
    premiumUntil: Date | null,
    platform: PremiumPlatform | null
  ): Promise<User | null> {
    let result;
    if (isPremium) {
      // When granting premium, never regress premium_until to an earlier date.
      // This prevents race conditions between webhooks and mobile sync where an
      // older expiration (e.g. trial end) overwrites a newer one (e.g. paid renewal).
      const premiumUntilExpr = premiumUntil ? `GREATEST(premium_until, $3)` : `$3`;
      result = await pool.query(
        `UPDATE users
           SET is_premium = $2,
               plan_tier = CASE WHEN plan_tier = 'master' THEN 'master' ELSE 'premium' END,
               premium_until = ${premiumUntilExpr},
               premium_platform = $4
           WHERE id = $1
           RETURNING *`,
        [userId, isPremium, premiumUntil, platform]
      );
    } else {
      result = await pool.query(
        `UPDATE users
           SET is_premium = $2, plan_tier = 'free', premium_until = $3, premium_platform = $4
           WHERE id = $1
           RETURNING *`,
        [userId, isPremium, premiumUntil, platform]
      );
    }
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async countAll(): Promise<{ total: number; premium: number; today: number }> {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_premium = TRUE)::int AS premium,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS today
      FROM users
    `);
    return result.rows[0];
  }

  async countIngredients(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM ingredients WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].total;
  }

  async countRecipes(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM recipes WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].total;
  }

  async createPasswordResetCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    // Invalidate previous unused codes for this user
    await pool.query(
      `UPDATE password_reset_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );
    await pool.query(
      `INSERT INTO password_reset_codes (user_id, code, expires_at) VALUES ($1, $2, $3)`,
      [userId, code, expiresAt]
    );
    return code;
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<{ valid: boolean; userId: string | null }> {
    const result = await pool.query(
      `SELECT prc.user_id FROM password_reset_codes prc
       JOIN users u ON u.id = prc.user_id
       WHERE u.email = $1 AND prc.code = $2 AND prc.used = FALSE AND prc.expires_at > NOW()
       ORDER BY prc.created_at DESC LIMIT 1`,
      [email.toLowerCase(), code]
    );
    if (result.rows.length === 0) return { valid: false, userId: null };
    return { valid: true, userId: result.rows[0].user_id };
  }

  async markResetCodeUsed(userId: string, code: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_codes SET used = TRUE WHERE user_id = $1 AND code = $2`,
      [userId, code]
    );
  }

  async delete(userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete recipe_ingredients first (has ON DELETE RESTRICT on ingredient_id)
      await client.query(
        `DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1)`,
        [userId]
      );
      // Now delete the user — remaining FKs all use ON DELETE CASCADE
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
  }

  async markTrialUsed(userId: string): Promise<void> {
    await pool.query(`UPDATE users SET trial_used_at = NOW() WHERE id = $1`, [userId]);
  }

  private mapRow(row: Record<string, unknown>): User & { passwordHash: string } {
    const premiumUntil = row.premium_until as Date | null;
    const trialUsedAt = row.trial_used_at as Date | null;
    return {
      id: row.id as string,
      companyName: row.company_name as string,
      email: row.email as string,
      phone: (row.phone as string | null) ?? null,
      instagramHandle: (row.instagram_handle as string | null) ?? null,
      passwordHash: row.password_hash as string,
      createdAt: (row.created_at as Date).toISOString(),
      isPremium: Boolean(row.is_premium),
      planTier: (row.plan_tier as PlanTier | null) ?? (Boolean(row.is_premium) ? 'premium' : 'free'),
      premiumUntil: premiumUntil ? premiumUntil.toISOString() : null,
      premiumPlatform: (row.premium_platform as PremiumPlatform | null) ?? null,
      isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
      trial_used_at: trialUsedAt ? trialUsedAt.toISOString() : null,
      signupPlatform: (row.signup_platform as 'ios' | 'android' | null) ?? null,
    };
  }
}
