import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { notifyPremiumEvent, notifyPixRequest } from '../../infrastructure/services/telegramService';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';

const userRepo = new PostgresUserRepository();
const pushTokenRepo = new PostgresPushTokenRepository();

export class PixController {
  /**
   * User creates a PIX payment request (mobile).
   * POST /api/pix/request
   * Body: { planLabel?: string, amountCents?: number }
   */
  async createRequest(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { planLabel, amountCents, planTier } = req.body as {
      planLabel?: string;
      amountCents?: number;
      planTier?: 'premium' | 'master';
    };
    const tier: 'premium' | 'master' = planTier === 'master' ? 'master' : 'premium';

    try {
      // Check if user already has a pending request
      const existing = await pool.query(
        `SELECT id FROM pix_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
        [userId]
      );
      if (existing.rows.length > 0) {
        res.json({ success: true, data: { id: existing.rows[0].id, status: 'pending', alreadyExists: true } });
        return;
      }

      const result = await pool.query(
        `INSERT INTO pix_requests (user_id, plan_label, plan_tier, amount_cents)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, created_at`,
        [userId, planLabel ?? 'Mensal', tier, amountCents ?? 0]
      );

      const user = await userRepo.findById(userId);
      // Notify admin via Telegram
      notifyPixRequest(
        user?.companyName ?? 'Usuário',
        user?.email ?? '',
        planLabel ?? 'Mensal',
        amountCents ?? 0
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[PIX] Create request error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * User checks their PIX request status (mobile).
   * GET /api/pix/status
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT id, status, plan_label, amount_cents, created_at, reviewed_at
         FROM pix_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        res.json({ success: true, data: null });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[PIX] Get status error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Admin lists PIX requests.
   * GET /api/admin/pix-requests?status=pending
   */
  async listRequests(req: Request, res: Response): Promise<void> {
    const status = (req.query.status as string) || 'pending';

    try {
      const result = await pool.query(
        `SELECT pr.id, pr.user_id, pr.status, pr.plan_label, pr.plan_tier, pr.amount_cents,
                pr.created_at, pr.reviewed_at, pr.reviewed_by,
                u.company_name, u.email, u.phone, u.is_premium, u.premium_until
         FROM pix_requests pr
         JOIN users u ON u.id = pr.user_id
         ${status !== 'all' ? 'WHERE pr.status = $1' : ''}
         ORDER BY pr.created_at DESC
         LIMIT 100`,
        status !== 'all' ? [status] : []
      );

      const data = result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        status: r.status,
        planLabel: r.plan_label,
        planTier: r.plan_tier ?? 'premium',
        amountCents: r.amount_cents,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        reviewedBy: r.reviewed_by,
        companyName: r.company_name,
        email: r.email,
        phone: r.phone,
        isPremium: r.is_premium,
        premiumUntil: r.premium_until,
      }));

      res.json({ success: true, data });
    } catch (error) {
      console.error('[PIX] List requests error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Admin approves a PIX request → user becomes premium.
   * POST /api/admin/pix-requests/:id/approve
   * Body: { days?: number } — defaults to 30
   */
  async approveRequest(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { days, planTier } = req.body as { days?: number; planTier?: 'premium' | 'master' };
    const premiumDays = days ?? 30;

    try {
      // Get the request
      const reqResult = await pool.query(
        `SELECT user_id, status, plan_tier, amount_cents FROM pix_requests WHERE id = $1`,
        [id]
      );
      if (reqResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }
      if (reqResult.rows[0].status !== 'pending') {
        res.status(400).json({ success: false, error: 'Request already processed' });
        return;
      }

      const userId = reqResult.rows[0].user_id;
      // Tier the user asked for, with an optional admin override in the body.
      const tier: 'premium' | 'master' =
        planTier === 'master' || planTier === 'premium'
          ? planTier
          : reqResult.rows[0].plan_tier === 'master' ? 'master' : 'premium';
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + premiumDays);

      // Update request status
      await pool.query(
        `UPDATE pix_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'admin'
         WHERE id = $1`,
        [id]
      );

      // Grant the chosen tier (manual platform).
      await userRepo.updatePlanTier(userId, tier, premiumUntil, 'manual');

      // Record premium event (com o valor pago, vindo da própria solicitação PIX)
      const pixAmountCents = reqResult.rows[0].amount_cents ?? null;
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store, amount_cents)
         VALUES ($1, 'INITIAL_PURCHASE', 'pix', 'manual', $2, $3, 'PIX', $4)`,
        [userId, tier === 'master' ? 'pix_master' : 'pix_premium', premiumUntil, pixAmountCents]
      );

      // Send push notification to user
      const tokens = await pushTokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        await sendPushNotifications(
          tokens.map(t => t.token),
          'Pagamento aprovado! 🎉',
          'Seu pagamento via PIX foi confirmado. Aproveite o DocePreço Premium!',
          { screen: 'Home' }
        );
      }

      const user = await userRepo.findById(userId);
      notifyPremiumEvent(user?.companyName ?? 'Usuário', 'PIX_APPROVED', 'pix');

      res.json({ success: true, data: { userId, premiumUntil } });
    } catch (error) {
      console.error('[PIX] Approve error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Admin rejects a PIX request.
   * POST /api/admin/pix-requests/:id/reject
   */
  async rejectRequest(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const reqResult = await pool.query(
        `SELECT user_id, status FROM pix_requests WHERE id = $1`,
        [id]
      );
      if (reqResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }
      if (reqResult.rows[0].status !== 'pending') {
        res.status(400).json({ success: false, error: 'Request already processed' });
        return;
      }

      await pool.query(
        `UPDATE pix_requests SET status = 'rejected', reviewed_at = NOW(), reviewed_by = 'admin'
         WHERE id = $1`,
        [id]
      );

      // Notify user
      const userId = reqResult.rows[0].user_id;
      const tokens = await pushTokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        await sendPushNotifications(
          tokens.map(t => t.token),
          'Pagamento não confirmado',
          'Não conseguimos confirmar seu pagamento via PIX. Por favor, tente novamente ou entre em contato.',
          { screen: 'Paywall' }
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[PIX] Reject error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
