import { pool } from '../database/connection';

export const REWARDED_RECIPE_DAILY_LIMIT = 3;

export class PostgresRewardedAdRepository {
  async createRecipeSession(userId: string): Promise<{ id: string; expiresAt: string }> {
    const result = await pool.query(
      `INSERT INTO rewarded_ad_sessions (user_id, feature, expires_at)
       VALUES ($1, 'recipes', NOW() + INTERVAL '15 minutes') RETURNING id, expires_at`,
      [userId]
    );
    return { id: result.rows[0].id, expiresAt: result.rows[0].expires_at.toISOString() };
  }

  async getSessionStatus(userId: string, sessionId: string): Promise<'pending' | 'rewarded' | 'expired' | 'missing'> {
    const result = await pool.query(
      `SELECT status, expires_at FROM rewarded_ad_sessions WHERE id = $1 AND user_id = $2 AND feature = 'recipes'`,
      [sessionId, userId]
    );
    const row = result.rows[0];
    if (!row) return 'missing';
    if (row.status === 'rewarded') return 'rewarded';
    return new Date(row.expires_at) > new Date() ? 'pending' : 'expired';
  }

  async getTodayRewardCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM rewarded_ad_credits
       WHERE user_id = $1 AND feature = 'recipes' AND created_at >= CURRENT_DATE`, [userId]
    );
    return result.rows[0]?.count ?? 0;
  }

  async claimRecipeCredit(userId: string): Promise<string | null> {
    const result = await pool.query(
      `WITH candidate AS (
        SELECT id FROM rewarded_ad_credits
        WHERE user_id = $1 AND feature = 'recipes' AND consumed_at IS NULL AND expires_at > NOW()
        ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE rewarded_ad_credits c SET consumed_at = NOW()
      FROM candidate WHERE c.id = candidate.id RETURNING c.id`, [userId]
    );
    return result.rows[0]?.id ?? null;
  }

  async attachCreditToRecipe(creditId: string, userId: string, recipeId: string): Promise<void> {
    await pool.query(
      `UPDATE rewarded_ad_credits SET consumed_for_recipe_id = $3
       WHERE id = $1 AND user_id = $2 AND consumed_at IS NOT NULL`, [creditId, userId, recipeId]
    );
  }

  async returnRecipeCredit(creditId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE rewarded_ad_credits SET consumed_at = NULL
       WHERE id = $1 AND user_id = $2 AND consumed_for_recipe_id IS NULL`, [creditId, userId]
    );
  }

  async grantVerifiedRecipeCredit(sessionId: string, transactionId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const session = await client.query(
        `SELECT user_id FROM rewarded_ad_sessions
         WHERE id = $1 AND feature = 'recipes' AND status = 'pending' AND expires_at > NOW() FOR UPDATE`, [sessionId]
      );
      if (!session.rows.length) { await client.query('ROLLBACK'); return; }
      const userId = session.rows[0].user_id;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
      const daily = await client.query(
        `SELECT COUNT(*)::int AS count FROM rewarded_ad_credits
         WHERE user_id = $1 AND feature = 'recipes' AND created_at >= CURRENT_DATE`, [userId]
      );
      if ((daily.rows[0]?.count ?? 0) >= REWARDED_RECIPE_DAILY_LIMIT) {
        await client.query(`UPDATE rewarded_ad_sessions SET status = 'expired' WHERE id = $1`, [sessionId]);
        await client.query('COMMIT'); return;
      }
      await client.query(
        `INSERT INTO rewarded_ad_credits (user_id, feature, session_id, ad_transaction_id, expires_at)
         VALUES ($1, 'recipes', $2, $3, NOW() + INTERVAL '24 hours') ON CONFLICT (ad_transaction_id) DO NOTHING`,
        [userId, sessionId, transactionId]
      );
      await client.query(`UPDATE rewarded_ad_sessions SET status = 'rewarded' WHERE id = $1`, [sessionId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
}
