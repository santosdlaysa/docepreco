import { pool } from '../database/connection';

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  createdAt: string;
}

export class PostgresPushTokenRepository {
  async upsert(userId: string, token: string, platform: string): Promise<PushToken> {
    const result = await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform
       RETURNING *`,
      [userId, token, platform]
    );
    return this.mapRow(result.rows[0]);
  }

  async findAll(): Promise<PushToken[]> {
    const result = await pool.query('SELECT * FROM push_tokens ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findByTarget(target: 'all' | 'premium' | 'free' | 'master'): Promise<PushToken[]> {
    if (target === 'all') {
      return this.findAll();
    }
    if (target === 'master') {
      const result = await pool.query(
        `SELECT pt.* FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.plan_tier = 'master'`
      );
      return result.rows.map(this.mapRow);
    }
    if (target === 'premium') {
      const result = await pool.query(
        `SELECT pt.* FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.is_premium = TRUE
           AND (u.premium_until IS NULL OR u.premium_until > NOW())`
      );
      return result.rows.map(this.mapRow);
    }
    // free: users who are not premium OR whose premium has expired
    const result = await pool.query(
      `SELECT pt.* FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
       WHERE u.is_premium = FALSE
          OR (u.is_premium = TRUE AND u.premium_until <= NOW())`
    );
    return result.rows.map(this.mapRow);
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    const result = await pool.query(
      'SELECT * FROM push_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(this.mapRow);
  }

  async removeByToken(token: string): Promise<void> {
    await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
  }

  private mapRow(row: Record<string, unknown>): PushToken {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      platform: row.platform as PushToken['platform'],
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}
