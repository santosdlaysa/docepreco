import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { getFreeRecipeLimit, isActivePremium } from './premium';

/** Access is derived from the current plan; renewal never needs to restore data. */
export async function getInactiveRecipeIds(userId: string): Promise<Set<string>> {
  const user = await new PostgresUserRepository().findById(userId);
  if (user && isActivePremium(user)) return new Set();
  const limit = await getFreeRecipeLimit();
  const result = await pool.query(
    `WITH ordered AS (
       SELECT r.id, ROW_NUMBER() OVER (ORDER BY r.created_at ASC, r.id ASC) AS position
       FROM recipes r WHERE r.user_id = $1
     )
     SELECT o.id FROM ordered o
     WHERE o.position > $2 AND NOT EXISTS (
       SELECT 1 FROM rewarded_ad_credits c
       WHERE c.consumed_for_recipe_id = o.id AND c.user_id = $1 AND c.feature = 'recipes'
     )`,
    [userId, limit]
  );
  return new Set(result.rows.map(row => row.id as string));
}
