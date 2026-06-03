import { pool } from '../database/connection';
import {
  generateReferralCode,
  REFERRALS_PER_REWARD,
  REWARD_DAYS,
} from '../../domain/services/referral';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maskEmail(email: string): string {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export interface ReferralProgress {
  code: string | null;
  validCount: number;
  rewardedCount: number;
  pendingCount: number;
  target: number;
  cycle: number;
  remainingToReward: number;
  rewardsEarned: number;
}

export interface ReferralHistoryItem {
  companyName: string;
  emailMasked: string;
  status: string;
  createdAt: Date;
  activatedAt: Date | null;
}

export interface GrantResult {
  rewardsGranted: number;
  newPremiumUntil: string | null;
}

export class PostgresReferralRepository {
  /**
   * Garante que o usuário tenha um referral_code, gerando um (com retry em
   * colisão) na primeira chamada. Retorna o código ou null se o usuário não existe.
   */
  async ensureCode(userId: string): Promise<string | null> {
    if (!UUID_RE.test(userId)) return null;
    const existing = await pool.query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) return null;
    if (existing.rows[0].referral_code) return existing.rows[0].referral_code as string;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      try {
        const res = await pool.query(
          `UPDATE users SET referral_code = $2 WHERE id = $1 AND referral_code IS NULL RETURNING referral_code`,
          [userId, code]
        );
        if (res.rows.length > 0) return res.rows[0].referral_code as string;
        // Outro processo setou o código concorrentemente — releia.
        const reread = await pool.query('SELECT referral_code FROM users WHERE id = $1', [userId]);
        if (reread.rows[0]?.referral_code) return reread.rows[0].referral_code as string;
      } catch {
        // Colisão de UNIQUE: tenta outro código.
      }
    }
    return null;
  }

  async findReferrerIdByCode(code: string): Promise<string | null> {
    const r = await pool.query('SELECT id FROM users WHERE referral_code = $1', [code]);
    return r.rows[0]?.id ?? null;
  }

  /**
   * Registra uma indicação pendente. Idempotente: um indicado só pode ser
   * indicado uma vez (UNIQUE referred_id). Não falha se já existir.
   */
  async createPendingReferral(referrerId: string, referredId: string, code: string): Promise<void> {
    if (referrerId === referredId) return; // auto-indicação
    await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (referred_id) DO NOTHING`,
      [referrerId, referredId, code]
    );
  }

  /**
   * Marca a indicação do indicado como válida (ele realizou a ação de ativação).
   * Idempotente: só afeta quem está 'pending'. Retorna o referrer_id se ativou,
   * ou null se não havia indicação pendente.
   */
  async activateReferral(referredId: string): Promise<string | null> {
    if (!UUID_RE.test(referredId)) return null;
    const r = await pool.query(
      `UPDATE referrals SET status = 'valid', activated_at = NOW()
       WHERE referred_id = $1 AND status = 'pending'
       RETURNING referrer_id`,
      [referredId]
    );
    return r.rows[0]?.referrer_id ?? null;
  }

  /**
   * Concede recompensas pendentes ao indicador: para cada lote de
   * REFERRALS_PER_REWARD indicações válidas, estende a assinatura em REWARD_DAYS.
   * Transacional com FOR UPDATE para evitar concessão de lote duplo em corrida.
   *
   * TODO(fundação 3-tier): quando o tier Master existir, trocar o UPDATE de
   * is_premium/premium_platform='manual' por updatePlanTier(..., 'master', ...).
   */
  async grantRewardIfEligible(referrerId: string): Promise<GrantResult> {
    if (!UUID_RE.test(referrerId)) return { rewardsGranted: 0, newPremiumUntil: null };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const valids = await client.query(
        `SELECT id FROM referrals
         WHERE referrer_id = $1 AND status = 'valid'
         ORDER BY activated_at ASC
         FOR UPDATE`,
        [referrerId]
      );
      let queue: string[] = valids.rows.map((r) => r.id as string);

      let rewardsGranted = 0;
      let newPremiumUntil: Date | null = null;

      while (queue.length >= REFERRALS_PER_REWARD) {
        const batch = queue.slice(0, REFERRALS_PER_REWARD);

        // Estende a partir do maior entre agora e a validade atual (lock na linha).
        const u = await client.query('SELECT premium_until FROM users WHERE id = $1 FOR UPDATE', [referrerId]);
        const currentRaw = u.rows[0]?.premium_until as Date | null;
        const current = currentRaw ? new Date(currentRaw) : null;
        const base = current && current.getTime() > Date.now() ? current : new Date();
        const until = new Date(base.getTime());
        until.setDate(until.getDate() + REWARD_DAYS);

        await client.query(
          `UPDATE users SET is_premium = TRUE, premium_until = $2, premium_platform = 'manual' WHERE id = $1`,
          [referrerId, until]
        );

        const evt = await client.query(
          `INSERT INTO premium_events (user_id, event_type, source, platform, expiration_at)
           VALUES ($1, 'REFERRAL_REWARD', 'referral', 'manual', $2) RETURNING id`,
          [referrerId, until]
        );
        const eventId = evt.rows[0].id as string;

        await client.query(
          `UPDATE referrals SET status = 'rewarded', rewarded_at = NOW(), reward_event_id = $2
           WHERE id = ANY($1::uuid[])`,
          [batch, eventId]
        );

        rewardsGranted++;
        newPremiumUntil = until;
        queue = queue.slice(REFERRALS_PER_REWARD);
      }

      await client.query('COMMIT');
      return {
        rewardsGranted,
        newPremiumUntil: newPremiumUntil ? newPremiumUntil.toISOString() : null,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getProgress(referrerId: string): Promise<ReferralProgress> {
    const code = await this.ensureCode(referrerId);
    const r = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('valid','rewarded'))::int AS valid_count,
         COUNT(*) FILTER (WHERE status = 'rewarded')::int AS rewarded_count,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count
       FROM referrals WHERE referrer_id = $1`,
      [referrerId]
    );
    const validCount = r.rows[0].valid_count as number;
    const rewardedCount = r.rows[0].rewarded_count as number;
    const pendingCount = r.rows[0].pending_count as number;
    const cycle = validCount % REFERRALS_PER_REWARD;
    return {
      code,
      validCount,
      rewardedCount,
      pendingCount,
      target: REFERRALS_PER_REWARD,
      cycle,
      remainingToReward: REFERRALS_PER_REWARD - cycle,
      rewardsEarned: Math.floor(rewardedCount / REFERRALS_PER_REWARD),
    };
  }

  async getHistory(referrerId: string): Promise<ReferralHistoryItem[]> {
    const r = await pool.query(
      `SELECT r.status, r.created_at, r.activated_at, u.company_name, u.email
       FROM referrals r JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC LIMIT 100`,
      [referrerId]
    );
    return r.rows.map((row) => ({
      companyName: row.company_name as string,
      emailMasked: maskEmail(row.email as string),
      status: row.status as string,
      createdAt: row.created_at as Date,
      activatedAt: (row.activated_at as Date | null) ?? null,
    }));
  }

  // ───────────────────────── Admin ─────────────────────────

  async listAll(status: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT r.id, r.status, r.referral_code, r.created_at, r.activated_at, r.rewarded_at,
              ref.company_name AS referrer_name, ref.email AS referrer_email,
              rd.company_name  AS referred_name, rd.email  AS referred_email
       FROM referrals r
       JOIN users ref ON ref.id = r.referrer_id
       JOIN users rd  ON rd.id  = r.referred_id
       ${status !== 'all' ? 'WHERE r.status = $1' : ''}
       ORDER BY r.created_at DESC LIMIT 200`,
      status !== 'all' ? [status] : []
    );
    return result.rows.map((r) => ({
      id: r.id,
      status: r.status,
      referralCode: r.referral_code,
      createdAt: r.created_at,
      activatedAt: r.activated_at,
      rewardedAt: r.rewarded_at,
      referrerName: r.referrer_name,
      referrerEmail: r.referrer_email,
      referredName: r.referred_name,
      referredEmail: r.referred_email,
    }));
  }

  async stats(): Promise<any> {
    const r = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending,
         COUNT(*) FILTER (WHERE status = 'valid')::int    AS valid,
         COUNT(*) FILTER (WHERE status = 'rewarded')::int AS rewarded,
         COUNT(*) FILTER (WHERE status = 'invalid')::int  AS invalid
       FROM referrals`
    );
    const row = r.rows[0];
    const activated = row.valid + row.rewarded;
    const conversion = row.total > 0 ? Math.round((activated / row.total) * 100) : 0;
    return { ...row, conversionPercent: conversion };
  }

  /** Invalida uma indicação (anti-fraude). Não mexe em indicações já recompensadas. */
  async invalidate(id: string): Promise<boolean> {
    const r = await pool.query(
      `UPDATE referrals SET status = 'invalid' WHERE id = $1 AND status <> 'rewarded'`,
      [id]
    );
    return (r.rowCount ?? 0) > 0;
  }

  /** Força uma indicação como válida (ajuste manual). Retorna o referrer_id para recompensa. */
  async forceValid(id: string): Promise<string | null> {
    const r = await pool.query(
      `UPDATE referrals SET status = 'valid', activated_at = COALESCE(activated_at, NOW())
       WHERE id = $1 AND status IN ('pending', 'invalid')
       RETURNING referrer_id`,
      [id]
    );
    return r.rows[0]?.referrer_id ?? null;
  }
}
