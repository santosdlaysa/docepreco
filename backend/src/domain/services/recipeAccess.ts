import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { getFreeRecipeLimit, isActivePremium } from './premium';

/** Access is derived from the current plan; renewal never needs to restore data. */
export async function getInactiveRecipeIds(userId: string): Promise<Set<string>> {
  const user = await new PostgresUserRepository().findById(userId);
  if (user && isActivePremium(user)) return new Set();
  const limit = await getFreeRecipeLimit();
  const result = await pool.query(
    `SELECT id FROM recipes WHERE user_id = $1 ORDER BY created_at ASC, id ASC OFFSET $2`,
    [userId, limit]
  );
  return new Set(result.rows.map(row => row.id as string));
}
