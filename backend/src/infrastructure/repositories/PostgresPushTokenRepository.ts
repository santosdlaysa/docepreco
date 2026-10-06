import { pool } from '../database/connection';

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
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

  /**
   * Assinatura Web Push do navegador. Remove antes a assinatura anterior do mesmo
   * endpoint (as chaves podem mudar) para não duplicar entregas.
   */
  async upsertWeb(userId: string, token: string, endpointPrefix: string): Promise<PushToken> {
    await pool.query(
      `DELETE FROM push_tokens WHERE platform = 'web' AND left(token, length($1)) = $1`,
      [endpointPrefix]
    );
    return this.upsert(userId, token, 'web');
  }

  async removeWebByEndpoint(userId: string, endpointPrefix: string): Promise<void> {
    await pool.query(
      `DELETE FROM push_tokens WHERE user_id = $1 AND platform = 'web' AND left(token, length($2)) = $2`,
      [userId, endpointPrefix]
    );
  }

  /** Assinaturas web (para os lembretes que no app são agendados localmente). */
  async findWebTokensByUserIds(userIds?: string[]): Promise<{ userId: string; token: string }[]> {
    const result = userIds
      ? await pool.query(`SELECT user_id, token FROM push_tokens WHERE platform = 'web' AND user_id = ANY($1::uuid[])`, [userIds])
      : await pool.query(
        `SELECT pt.user_id, pt.token FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE pt.platform = 'web' AND COALESCE(u.is_active, TRUE)`
      );
    return result.rows.map((r: Record<string, unknown>) => ({ userId: r.user_id as string, token: r.token as string }));
  }

  async findAll(): Promise<PushToken[]> {
    const result = await pool.query('SELECT * FROM push_tokens ORDER BY created_at DESC');
    return result.rows.map(this.mapRow);
  }

  async findByTarget(target: 'all' | 'premium' | 'free' | 'master' | 'expired'): Promise<PushToken[]> {
    if (target === 'all') {
      return this.findAll();
    }
    if (target === 'expired') {
      // Ex-assinantes: já tiveram plano pago e ele venceu. Não exige is_premium = FALSE
      // para também alcançar quem o webhook ainda não sincronizou.
      const result = await pool.query(
        `SELECT pt.* FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.premium_until IS NOT NULL AND u.premium_until <= NOW()`
      );
      return result.rows.map(this.mapRow);
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
      // Apenas assinantes do tier premium vigente. Usa plan_tier (não a flag
      // legada is_premium, que também é TRUE para master e cortesias) para não
      // misturar master/vitalícios na audiência "premium".
      const result = await pool.query(
        `SELECT pt.* FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.plan_tier = 'premium'
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
