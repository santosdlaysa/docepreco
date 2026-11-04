import type { PoolClient } from 'pg';
import { pool } from '../database/connection';
import {
  CheckinConfig,
  CheckinRewardTier,
  computeCheckinProgress,
  normalizeCheckinConfig,
} from '../../domain/services/checkin';

const CONFIG_KEY = 'checkin_config';
const TODAY_SQL = `(NOW() AT TIME ZONE 'America/Sao_Paulo')::date`;
const TIER_RANK: Record<string, number> = { free: 0, premium: 1, master: 2 };

type Queryable = Pick<PoolClient, 'query'>;

export interface CheckinStatus {
  enabled: boolean;
  /** Só quem não tem plano pago vigente participa (o cartão/loja controlam a validade dos pagantes). */
  eligible: boolean;
  title: string;
  message: string;
  daysRequired: number;
  rewardDays: number;
  rewardTier: CheckinRewardTier;
  consecutive: boolean;
  maxRewardsPerUser: number;
  today: string;
  checkedInToday: boolean;
  progress: number;
  rewardsEarned: number;
  canEarnMore: boolean;
}

export interface CheckinReward {
  tier: CheckinRewardTier;
  days: number;
  premiumUntil: string;
}

export class CheckinNotAvailableError extends Error {}

export class PostgresCheckinRepository {
  async getConfig(db: Queryable = pool): Promise<CheckinConfig> {
    const r = await db.query(`SELECT value FROM app_settings WHERE key = $1`, [CONFIG_KEY]);
    if (r.rows.length === 0) return normalizeCheckinConfig(null);
    try {
      return normalizeCheckinConfig(JSON.parse(r.rows[0].value));
    } catch {
      return normalizeCheckinConfig(null);
    }
  }

  async saveConfig(partial: Partial<CheckinConfig>): Promise<CheckinConfig> {
    const config = normalizeCheckinConfig({ ...(await this.getConfig()), ...partial });
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [CONFIG_KEY, JSON.stringify(config)]
    );
    return config;
  }

  async getStatus(userId: string, db: Queryable = pool, config?: CheckinConfig): Promise<CheckinStatus> {
    const cfg = config ?? await this.getConfig(db);
    const base = await db.query(
      `SELECT ${TODAY_SQL}::text AS today,
              COALESCE(NOT (is_premium AND (premium_until IS NULL
                OR (premium_until > NOW() AND COALESCE(premium_platform, '') IN ('ios', 'android', 'card', 'pix')))), TRUE) AS eligible,
              (SELECT MAX(day) FROM checkin_rewards WHERE user_id = $1)::text AS "lastRewardDay",
              (SELECT COUNT(*)::int FROM checkin_rewards WHERE user_id = $1) AS "rewardsEarned"
         FROM users WHERE id = $1`,
      [userId]
    );
    const row = base.rows[0];
    const today: string = row?.today;
    const lastRewardDay: string | null = row?.lastRewardDay ?? null;

    const days = await db.query(
      `SELECT day::text AS day FROM activity_checkins
        WHERE user_id = $1 AND ($2::date IS NULL OR day > $2::date)
        ORDER BY day DESC LIMIT 120`,
      [userId, lastRewardDay]
    );
    const cycleDays: string[] = days.rows.map(r => r.day);
    const rewardsEarned: number = row?.rewardsEarned ?? 0;

    return {
      enabled: cfg.enabled,
      eligible: !!row?.eligible,
      title: cfg.title,
      message: cfg.message,
      daysRequired: cfg.daysRequired,
      rewardDays: cfg.rewardDays,
      rewardTier: cfg.rewardTier,
      consecutive: cfg.consecutive,
      maxRewardsPerUser: cfg.maxRewardsPerUser,
      today,
      // O dia do prêmio fecha o ciclo, então também conta como check-in de hoje.
      checkedInToday: cycleDays[0] === today || lastRewardDay === today,
      progress: computeCheckinProgress(cycleDays, today, cfg.consecutive),
      rewardsEarned,
      canEarnMore: cfg.maxRewardsPerUser === 0 || rewardsEarned < cfg.maxRewardsPerUser,
    };
  }

  /**
   * Registra o check-in de hoje e, se fechar o ciclo, libera o plano estendendo
   * a partir de max(agora, validade atual) — sem rebaixar quem já está num tier maior.
   */
  async checkIn(userId: string): Promise<{ status: CheckinStatus; reward: CheckinReward | null; alreadyCheckedIn: boolean }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serializa check-ins simultâneos da mesma pessoa.
      const u = await client.query(
        `SELECT plan_tier, premium_until, is_premium FROM users WHERE id = $1 FOR UPDATE`,
        [userId]
      );
      if (u.rows.length === 0) throw new CheckinNotAvailableError('Usuário não encontrado');

      const config = await this.getConfig(client);
      const before = await this.getStatus(userId, client, config);
      if (!config.enabled) throw new CheckinNotAvailableError('O check-in não está disponível no momento.');
      if (!before.eligible) throw new CheckinNotAvailableError('O check-in é exclusivo para quem não tem assinatura ativa.');
      if (before.checkedInToday) {
        await client.query('COMMIT');
        return { status: before, reward: null, alreadyCheckedIn: true };
      }

      await client.query(
        `INSERT INTO activity_checkins (user_id, day) VALUES ($1, ${TODAY_SQL}) ON CONFLICT DO NOTHING`,
        [userId]
      );

      let status = await this.getStatus(userId, client, config);
      let reward: CheckinReward | null = null;

      if (status.progress >= config.daysRequired && status.canEarnMore) {
        const user = u.rows[0];
        const current = user.premium_until ? new Date(user.premium_until) : null;
        const active = !!user.is_premium && !!current && current.getTime() > Date.now();
        const base = active ? current! : new Date();
        const until = new Date(base.getTime());
        until.setDate(until.getDate() + config.rewardDays);
        const tier: CheckinRewardTier = active && TIER_RANK[user.plan_tier] > TIER_RANK[config.rewardTier]
          ? user.plan_tier
          : config.rewardTier;

        await client.query(
          `UPDATE users SET is_premium = TRUE, plan_tier = $2, premium_until = $3, premium_platform = 'manual' WHERE id = $1`,
          [userId, tier, until]
        );
        const evt = await client.query(
          `INSERT INTO premium_events (user_id, event_type, source, platform, expiration_at)
           VALUES ($1, 'CHECKIN_REWARD', 'checkin', 'manual', $2) RETURNING id`,
          [userId, until]
        );
        await client.query(
          `INSERT INTO checkin_rewards (user_id, day, reward_days, tier, premium_until, premium_event_id)
           VALUES ($1, ${TODAY_SQL}, $2, $3, $4, $5)`,
          [userId, config.rewardDays, tier, until, evt.rows[0].id]
        );

        reward = { tier, days: config.rewardDays, premiumUntil: until.toISOString() };
        // A pessoa passa a ter plano manual (não pago), então segue elegível para o próximo ciclo.
        status = await this.getStatus(userId, client, config);
      }

      await client.query('COMMIT');
      return { status, reward, alreadyCheckedIn: false };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getAdminStats() {
    const [summary, daily, rewards] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM activity_checkins WHERE day = ${TODAY_SQL}) AS "checkinsToday",
          (SELECT COUNT(DISTINCT user_id)::int FROM activity_checkins WHERE day > ${TODAY_SQL} - 7) AS "activeUsers7d",
          (SELECT COUNT(*)::int FROM activity_checkins) AS "totalCheckins",
          (SELECT COUNT(*)::int FROM checkin_rewards) AS "totalRewards",
          (SELECT COUNT(DISTINCT user_id)::int FROM checkin_rewards) AS "rewardedUsers"
      `),
      pool.query(`
        SELECT d::date::text AS day, COUNT(c.user_id)::int AS count
          FROM generate_series(${TODAY_SQL} - 13, ${TODAY_SQL}, INTERVAL '1 day') d
          LEFT JOIN activity_checkins c ON c.day = d::date
         GROUP BY d ORDER BY d
      `),
      pool.query(`
        SELECT r.id, r.day::text AS day, r.reward_days AS "rewardDays", r.tier,
               r.premium_until AS "premiumUntil", r.created_at AS "createdAt",
               u.company_name AS "companyName", u.email
          FROM checkin_rewards r JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC LIMIT 50
      `),
    ]);
    return { ...summary.rows[0], daily: daily.rows, recentRewards: rewards.rows };
  }
}
