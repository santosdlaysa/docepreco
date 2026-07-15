import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { notifyPremiumEvent, notifyPixRequest } from '../../infrastructure/services/telegramService';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { createMpPixPayment, getMpPaymentInfo } from '../../infrastructure/services/mercadoPagoService';
import { PostgresBannerRepository } from '../../infrastructure/repositories/PostgresBannerRepository';
import { getActiveOffer, applyDiscount, attachPixRequest, redeemByPixRequest } from '../../infrastructure/services/winbackService';

const userRepo = new PostgresUserRepository();
const pushTokenRepo = new PostgresPushTokenRepository();
const bannerRepo = new PostgresBannerRepository();

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

    // Oferta win-back ativa → o valor do PIX já sai com o desconto aplicado,
    // sem depender de mudança no app (o QR do Mercado Pago cobra o valor final).
    const winbackOffer = await getActiveOffer(userId).catch(() => null);
    const baseCents = amountCents ?? 0;
    const finalCents = winbackOffer ? applyDiscount(baseCents, winbackOffer.discountPercent) : baseCents;
    const finalLabel = winbackOffer
      ? `${planLabel ?? 'Mensal'} • Volta com ${winbackOffer.discountPercent}% OFF`
      : (planLabel ?? 'Mensal');

    try {
      // Check if user already has a pending request
      const existing = await pool.query(
        `SELECT id, status, plan_label, amount_cents, mp_qr_code, mp_qr_code_base64 FROM pix_requests WHERE user_id = $1 AND status = 'pending' AND product_type = 'subscription' LIMIT 1`,
        [userId]
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        let mpQrCode: string | null = row.mp_qr_code;
        let mpQrCodeBase64: string | null = row.mp_qr_code_base64;

        // Pedido antigo sem QR do MP — gera agora com o valor gravado no pedido
        if (!mpQrCode) {
          try {
            const user = await userRepo.findById(userId);
            const mp = await createMpPixPayment({
              amountCents: row.amount_cents ?? finalCents,
              description: `DocePreço ${row.plan_label ?? finalLabel} - ${tier}`,
              payerEmail: user?.email ?? 'cliente@docepreco.com',
              externalReference: row.id,
            });
            mpQrCode = mp.qrCode;
            mpQrCodeBase64 = mp.qrCodeBase64;
            await pool.query(
              `UPDATE pix_requests SET mp_payment_id = $1, mp_qr_code = $2, mp_qr_code_base64 = $3 WHERE id = $4`,
              [mp.paymentId, mpQrCode, mpQrCodeBase64, row.id]
            );
          } catch (mpErr) {
            console.error('[PIX] Erro ao gerar QR para pedido existente:', mpErr);
          }
        }

        res.json({
          success: true,
          data: {
            id: row.id,
            status: row.status,
            alreadyExists: true,
            mp_qr_code: mpQrCode,
            mp_qr_code_base64: mpQrCodeBase64,
          },
        });
        return;
      }

      const result = await pool.query(
        `INSERT INTO pix_requests (user_id, plan_label, plan_tier, amount_cents)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, created_at`,
        [userId, finalLabel, tier, finalCents]
      );

      const pixRequestId: string = result.rows[0].id;
      if (winbackOffer) {
        await attachPixRequest(winbackOffer.id, pixRequestId).catch(() => {});
      }
      const user = await userRepo.findById(userId);

      // Gera pagamento PIX no Mercado Pago
      let mpQrCode: string | null = null;
      let mpQrCodeBase64: string | null = null;
      try {
        const mp = await createMpPixPayment({
          amountCents: finalCents,
          description: `DocePreço ${finalLabel} - ${tier}`,
          payerEmail: user?.email ?? 'cliente@docepreco.com',
          externalReference: pixRequestId,
        });

        mpQrCode = mp.qrCode;
        mpQrCodeBase64 = mp.qrCodeBase64;

        await pool.query(
          `UPDATE pix_requests SET mp_payment_id = $1, mp_qr_code = $2, mp_qr_code_base64 = $3 WHERE id = $4`,
          [mp.paymentId, mpQrCode, mpQrCodeBase64, pixRequestId]
        );
      } catch (mpErr) {
        console.error('[PIX] Erro ao gerar QR no Mercado Pago (continuando no modo manual):', mpErr);
      }

      // Notifica admin via Telegram
      notifyPixRequest(
        user?.companyName ?? 'Usuário',
        user?.email ?? '',
        finalLabel,
        finalCents
      );

      res.status(201).json({
        success: true,
        data: {
          ...result.rows[0],
          mp_qr_code: mpQrCode,
          mp_qr_code_base64: mpQrCodeBase64,
        },
      });
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
        `SELECT id, status, plan_label, amount_cents, created_at, reviewed_at, mp_qr_code, mp_qr_code_base64
         FROM pix_requests
         WHERE user_id = $1 AND product_type = 'subscription'
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
                pr.created_at, pr.reviewed_at, pr.reviewed_by, pr.product_type, pr.ref_id,
                u.company_name, u.email, u.phone, u.is_premium, u.premium_until,
                b.image_url AS banner_image_url, b.duration_days AS banner_duration_days
         FROM pix_requests pr
         JOIN users u ON u.id = pr.user_id
         LEFT JOIN banners b ON b.id = pr.ref_id AND pr.product_type = 'ad_banner'
         WHERE pr.product_type IN ('subscription', 'ad_banner')
         ${status !== 'all' ? 'AND pr.status = $1' : ''}
         ORDER BY pr.created_at DESC
         LIMIT 100`,
        status !== 'all' ? [status] : []
      );

      const data = result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        status: r.status,
        productType: r.product_type ?? 'subscription',
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
        // Anúncio de carrossel: arte e duração para o admin conferir antes de aprovar.
        bannerImageUrl: r.banner_image_url ?? null,
        bannerDurationDays: r.banner_duration_days ?? null,
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
        `SELECT user_id, status, plan_tier, amount_cents, product_type, ref_id FROM pix_requests WHERE id = $1`,
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

      // Compra de anúncio no carrossel → ativa o banner em vez de liberar premium.
      if (reqResult.rows[0].product_type === 'ad_banner') {
        const bannerId = reqResult.rows[0].ref_id as string | null;
        await pool.query(
          `UPDATE pix_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'admin' WHERE id = $1`,
          [id]
        );
        if (bannerId) {
          const banner = await bannerRepo.findById(bannerId);
          if (banner) await bannerRepo.activateSponsored(bannerId, banner.durationDays);
        }
        const adTokens = await pushTokenRepo.findByUserId(userId);
        if (adTokens.length > 0) {
          await sendPushNotifications(
            adTokens.map(t => t.token),
            'Anúncio no ar! 🎉',
            'Seu pagamento foi confirmado e seu banner já está aparecendo na Home do DocePreço.',
            { screen: 'Home' }
          );
        }
        res.json({ success: true, data: { bannerId } });
        return;
      }
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

      // Oferta win-back vinculada a este pedido → marca como resgatada
      await redeemByPixRequest(id).catch(() => {});

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
   * Webhook do Mercado Pago — aprovação automática ao receber confirmação de pagamento.
   * POST /api/pix/webhook/mercadopago
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    // Responde 200 imediatamente para o MP não reenviar
    res.status(200).json({ received: true });

    try {
      const { type, data } = req.body as { type?: string; data?: { id?: string } };

      if (type !== 'payment' || !data?.id) return;

      const paymentId = String(data.id);

      // Consulta o pagamento no MP para confirmar status
      let mpInfo: { status: string; externalReference: string };
      try {
        mpInfo = await getMpPaymentInfo(paymentId);
      } catch (err) {
        console.error('[PIX Webhook] Erro ao consultar pagamento no MP:', err);
        return;
      }

      if (mpInfo.status !== 'approved') return;

      const pixRequestId = mpInfo.externalReference;
      if (!pixRequestId) return;

      // Busca a pix_request correspondente
      const reqResult = await pool.query(
        `SELECT id, user_id, status, plan_tier, amount_cents, product_type, ref_id FROM pix_requests WHERE id = $1`,
        [pixRequestId]
      );

      if (reqResult.rows.length === 0) {
        console.warn(`[PIX Webhook] pix_request não encontrada: ${pixRequestId}`);
        return;
      }

      if (reqResult.rows[0].status !== 'pending') {
        console.log(`[PIX Webhook] pix_request ${pixRequestId} já processada (${reqResult.rows[0].status})`);
        return;
      }

      const userId = reqResult.rows[0].user_id;

      // Compra de anúncio no carrossel → ativa o banner e encerra aqui.
      if (reqResult.rows[0].product_type === 'ad_banner') {
        const bannerId = reqResult.rows[0].ref_id as string | null;
        await pool.query(
          `UPDATE pix_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'mercadopago' WHERE id = $1`,
          [pixRequestId]
        );
        if (bannerId) {
          const banner = await bannerRepo.findById(bannerId);
          if (banner) await bannerRepo.activateSponsored(bannerId, banner.durationDays);
        }
        const tokens = await pushTokenRepo.findByUserId(userId);
        if (tokens.length > 0) {
          await sendPushNotifications(
            tokens.map(t => t.token),
            'Anúncio no ar! 🎉',
            'Seu pagamento foi confirmado e seu banner já está aparecendo na Home do DocePreço.',
            { screen: 'Home' }
          );
        }
        console.log(`[PIX Webhook] Anúncio ${bannerId} ativado via MP (payment ${paymentId})`);
        return;
      }


      const tier: 'premium' | 'master' = reqResult.rows[0].plan_tier === 'master' ? 'master' : 'premium';
      const premiumDays = tier === 'master' ? 30 : 30;
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + premiumDays);

      await pool.query(
        `UPDATE pix_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'mercadopago' WHERE id = $1`,
        [pixRequestId]
      );

      await userRepo.updatePlanTier(userId, tier, premiumUntil, 'manual');

      // Oferta win-back vinculada a este pedido → marca como resgatada
      await redeemByPixRequest(pixRequestId).catch(() => {});

      const pixAmountCents = reqResult.rows[0].amount_cents ?? null;
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store, amount_cents)
         VALUES ($1, 'INITIAL_PURCHASE', 'pix', 'manual', $2, $3, 'PIX', $4)`,
        [userId, tier === 'master' ? 'pix_master' : 'pix_premium', premiumUntil, pixAmountCents]
      );

      // Notifica o usuário por push
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

      console.log(`[PIX Webhook] Usuário ${userId} aprovado automaticamente via MP (payment ${paymentId})`);
    } catch (err) {
      console.error('[PIX Webhook] Erro inesperado:', err);
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
        `SELECT user_id, status, product_type, ref_id FROM pix_requests WHERE id = $1`,
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

      const userId = reqResult.rows[0].user_id;
      const isAdBanner = reqResult.rows[0].product_type === 'ad_banner';

      // Anúncio recusado → remove o banner pendente para não deixar lixo.
      if (isAdBanner && reqResult.rows[0].ref_id) {
        await bannerRepo.delete(reqResult.rows[0].ref_id as string);
      }

      // Notify user
      const tokens = await pushTokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        await sendPushNotifications(
          tokens.map(t => t.token),
          isAdBanner ? 'Anúncio não confirmado' : 'Pagamento não confirmado',
          isAdBanner
            ? 'Não conseguimos confirmar o pagamento do seu anúncio. Por favor, tente novamente ou entre em contato.'
            : 'Não conseguimos confirmar seu pagamento via PIX. Por favor, tente novamente ou entre em contato.',
          { screen: isAdBanner ? 'Home' : 'Paywall' }
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[PIX] Reject error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
