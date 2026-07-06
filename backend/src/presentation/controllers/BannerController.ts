import { Request, Response } from 'express';
import { PostgresBannerRepository } from '../../infrastructure/repositories/PostgresBannerRepository';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';
import { getAdBannerConfig } from './adBannerDefaults';
import { createMpPixPayment } from '../../infrastructure/services/mercadoPagoService';
import { notifyPixRequest } from '../../infrastructure/services/telegramService';

const repo = new PostgresBannerRepository();
const userRepo = new PostgresUserRepository();

export class BannerController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const banners = await repo.findAll();
      res.json({ success: true, data: banners });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar banners' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const banners = await repo.findActive();
      res.json({ success: true, data: banners });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar banners ativos' });
    }
  }

  /** Público (mobile): banners patrocinados ativos e pagos, para o carrossel da Home. */
  async getCarousel(_req: Request, res: Response): Promise<void> {
    try {
      const banners = await repo.findActiveCarousel();
      res.json({ success: true, data: banners });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar banners do carrossel' });
    }
  }

  /**
   * Confeitaria compra um espaço no carrossel (mobile, autenticado).
   * Cria o banner inativo + uma pix_request 'ad_banner' e devolve o QR do Mercado Pago.
   * POST /banners/purchase
   * Body: { imageBase64, periodDays, actionUrl?, title?, message? }
   */
  async purchase(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { imageBase64, periodDays, actionUrl, title, message } = req.body as {
      imageBase64?: string;
      periodDays?: number;
      actionUrl?: string;
      title?: string;
      message?: string;
    };

    if (!imageBase64 || !periodDays) {
      res.status(400).json({ success: false, error: 'imageBase64 e periodDays são obrigatórios' });
      return;
    }

    try {
      const config = await getAdBannerConfig();
      if (!config.enabled) {
        res.status(403).json({ success: false, error: 'Anúncios indisponíveis no momento' });
        return;
      }
      const period = config.periods.find(p => p.days === Number(periodDays));
      if (!period) {
        res.status(400).json({ success: false, error: 'Período inválido' });
        return;
      }

      const user = await userRepo.findById(userId);

      const banner = await repo.createSponsored({
        title: (title?.trim() || user?.companyName || 'Confeitaria').slice(0, 255),
        message: (message?.trim() || '').slice(0, 2000),
        actionUrl: actionUrl?.trim() || null,
        imageUrl: imageBase64,
        companyId: userId,
        durationDays: period.days,
      });

      const prResult = await pool.query(
        `INSERT INTO pix_requests (user_id, plan_label, plan_tier, amount_cents, product_type, ref_id)
         VALUES ($1, $2, 'premium', $3, 'ad_banner', $4)
         RETURNING id`,
        [userId, `Anúncio ${period.days} dias`, period.amountCents, banner.id]
      );
      const pixRequestId: string = prResult.rows[0].id;

      let mpQrCode: string | null = null;
      let mpQrCodeBase64: string | null = null;
      try {
        const mp = await createMpPixPayment({
          amountCents: period.amountCents,
          description: `DocePreço Anúncio ${period.days} dias`,
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
        console.error('[Banner] Erro ao gerar QR no Mercado Pago:', mpErr);
      }

      notifyPixRequest(
        user?.companyName ?? 'Confeitaria',
        user?.email ?? '',
        `Anúncio ${period.days} dias`,
        period.amountCents
      );

      res.status(201).json({
        success: true,
        data: {
          pixRequestId,
          bannerId: banner.id,
          amountCents: period.amountCents,
          priceLabel: period.priceLabel,
          mp_qr_code: mpQrCode,
          mp_qr_code_base64: mpQrCodeBase64,
        },
      });
    } catch (error) {
      console.error('[Banner] Purchase error:', error);
      res.status(500).json({ success: false, error: 'Erro ao criar anúncio' });
    }
  }

  /** Status de uma compra de anúncio (mobile). GET /banners/purchase/:id/status */
  async getPurchaseStatus(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    try {
      const result = await pool.query(
        `SELECT status FROM pix_requests WHERE id = $1 AND user_id = $2 AND product_type = 'ad_banner' LIMIT 1`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Pedido não encontrado' });
        return;
      }
      res.json({ success: true, data: { status: result.rows[0].status } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao consultar status' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, type, actionUrl, startsAt, endsAt } = req.body;
      if (!title || !message || !type) {
        res.status(400).json({ success: false, error: 'title, message e type são obrigatórios' });
        return;
      }
      if (!['info', 'warning', 'promo', 'update'].includes(type)) {
        res.status(400).json({ success: false, error: 'type inválido' });
        return;
      }
      const banner = await repo.create({ title, message, type, actionUrl, startsAt, endsAt });
      res.status(201).json({ success: true, data: banner });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao criar banner' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, message, type, actionUrl, startsAt, endsAt, isActive } = req.body;
      const banner = await repo.update(id, { title, message, type, actionUrl, startsAt, endsAt, isActive });
      if (!banner) {
        res.status(404).json({ success: false, error: 'Banner não encontrado' });
        return;
      }
      res.json({ success: true, data: banner });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar banner' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await repo.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Banner não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir banner' });
    }
  }
}
