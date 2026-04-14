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

  async findByTarget(target: 'all' | 'premium' | 'free'): Promise<PushToken[]> {
    if (target === 'all') {
      return this.findAll();
    }
    const isPremium = target === 'premium';
    const result = await pool.query(
      `SELECT pt.* FROM push_tokens pt
       JOIN users u ON u.id = pt.user_id
       WHERE u.is_premium = $1`,
      [isPremium]
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
