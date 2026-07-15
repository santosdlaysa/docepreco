import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { sendWinbackEmail } from '../../infrastructure/services/emailService';
import { sendWhatsAppMessage } from '../../infrastructure/services/whatsappService';

const pushTokenRepo = new PostgresPushTokenRepository();

interface EligibleUser {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  premium_until: Date;
  last_product: string | null;
}

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/** Preços mensais atuais (centavos) a partir do app_settings, com os mesmos defaults do PlanConfig. */
async function getMonthlyPrices(): Promise<{ premium: number; master: number }> {
  const result = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('plan_pix_monthly', 'plan_pix_monthly_master')`
  );
  let premium = 1490;
  let master = 3000;
  for (const row of result.rows) {
    try {
      const parsed = JSON.parse(row.value);
      if (typeof parsed?.amountCents === 'number' && parsed.amountCents > 0) {
        if (row.key === 'plan_pix_monthly') premium = parsed.amountCents;
        else master = parsed.amountCents;
      }
    } catch {
      // valor inválido no settings → mantém default
    }
  }
  return { premium, master };
}

/** Ex-assinantes (premium expirado) sem oferta win-back ativa. */
async function findEligibleUsers(userIds?: string[]): Promise<EligibleUser[]> {
  const params: unknown[] = [];
  let idFilter = '';
  if (userIds && userIds.length > 0) {
    params.push(userIds);
    idFilter = `AND u.id = ANY($1::uuid[])`;
  }
  const result = await pool.query(
    `SELECT u.id, u.company_name, u.email, u.phone, u.premium_until,
            (SELECT pe.product_id FROM premium_events pe
             WHERE pe.user_id = u.id AND pe.product_id IS NOT NULL
             ORDER BY pe.created_at DESC LIMIT 1) AS last_product
     FROM users u
     WHERE u.is_premium = FALSE
       AND u.premium_until IS NOT NULL
       AND u.premium_until <= NOW()
       AND NOT EXISTS (
         SELECT 1 FROM winback_offers w
         WHERE w.user_id = u.id AND w.status = 'active' AND w.expires_at > NOW()
       )
       ${idFilter}
     ORDER BY u.premium_until DESC`,
    params
  );
  return result.rows;
}

export class WinbackController {
  /**
   * Lista ex-assinantes elegíveis para a campanha (prévia antes do disparo).
   * GET /api/admin/winback/eligible
   */
  async listEligible(_req: Request, res: Response): Promise<void> {
    try {
      const users = await findEligibleUsers();
      res.json({
        success: true,
        data: users.map(u => ({
          userId: u.id,
          companyName: u.company_name,
          email: u.email,
          phone: u.phone,
          premiumUntil: u.premium_until,
          lastProduct: u.last_product,
        })),
      });
    } catch (error) {
      console.error('[Winback] List eligible error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Dispara a campanha win-back: cria ofertas e envia push + e-mail (+ WhatsApp opcional).
   * POST /api/admin/winback/send
   * Body: { discountPercent?: number, validDays?: number, userIds?: string[], includeWhatsapp?: boolean }
   */
  async sendCampaign(req: Request, res: Response): Promise<void> {
    const {
      discountPercent = 50,
      validDays = 7,
      userIds,
      includeWhatsapp = false,
    } = req.body as {
      discountPercent?: number;
      validDays?: number;
      userIds?: string[];
      includeWhatsapp?: boolean;
    };

    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 90) {
      res.status(400).json({ success: false, error: 'discountPercent deve ser um inteiro entre 1 e 90' });
      return;
    }
    if (!Number.isInteger(validDays) || validDays < 1 || validDays > 60) {
      res.status(400).json({ success: false, error: 'validDays deve ser um inteiro entre 1 e 60' });
      return;
    }

    try {
      const eligible = await findEligibleUsers(userIds);
      if (eligible.length === 0) {
        res.json({ success: true, data: { total: 0, offersCreated: 0, pushSent: 0, emailSent: 0, whatsappSent: 0, users: [] } });
        return;
      }

      const prices = await getMonthlyPrices();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validDays);
      const validUntilLabel = expiresAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      let pushSent = 0;
      let emailSent = 0;
      let whatsappSent = 0;
      const users: Array<{ userId: string; companyName: string; push: boolean; email: boolean; whatsapp: boolean }> = [];

      for (const user of eligible) {
        const offerResult = await pool.query(
          `INSERT INTO winback_offers (user_id, discount_percent, expires_at)
           VALUES ($1, $2, $3) RETURNING id`,
          [user.id, discountPercent, expiresAt]
        );
        const offerId: string = offerResult.rows[0].id;

        const isMaster = (user.last_product ?? '').toLowerCase().includes('master');
        const fullCents = isMaster ? prices.master : prices.premium;
        const discountedCents = Math.max(0, Math.round(fullCents * (100 - discountPercent) / 100));

        let pushOk = false;
        let emailOk = false;
        let whatsOk = false;

        // Push (best effort — muitos expirados podem não ter mais o app)
        try {
          const tokens = await pushTokenRepo.findByUserId(user.id);
          if (tokens.length > 0) {
            const count = await sendPushNotifications(
              tokens.map(t => t.token),
              'Um presente para você voltar! 🎁',
              `${user.company_name}, volte com ${discountPercent}% de desconto no primeiro mês: de ${formatBRL(fullCents)} por ${formatBRL(discountedCents)}. Válido até ${validUntilLabel}!`,
              { type: 'winback_offer', screen: 'Paywall' }
            );
            pushOk = count > 0;
          }
        } catch (err) {
          console.error(`[Winback] Push falhou para ${user.email}:`, err);
        }

        // E-mail
        try {
          await sendWinbackEmail(user.email, user.company_name, {
            discountPercent,
            fullPriceLabel: formatBRL(fullCents),
            discountedPriceLabel: formatBRL(discountedCents),
            validUntilLabel,
          });
          emailOk = true;
          // Resend rate limit
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`[Winback] E-mail falhou para ${user.email}:`, err);
        }

        // WhatsApp (opcional, best effort)
        if (includeWhatsapp && user.phone) {
          try {
            await sendWhatsAppMessage(
              user.phone,
              `Oi, ${user.company_name}! 💖 Sentimos sua falta no Precifica Doces.\n\n` +
              `Preparamos uma oferta exclusiva para você voltar: *${discountPercent}% de desconto* no primeiro mês — ` +
              `de ${formatBRL(fullCents)} por *${formatBRL(discountedCents)}*.\n\n` +
              `É só abrir o app e tocar em *Assinar via PIX*: o app mostra o preço normal, mas o seu QR já sai com o desconto — ` +
              `na hora de pagar, o banco mostra *${formatBRL(discountedCents)}*. Sem cupom.\n\n` +
              `⏰ Válido até ${validUntilLabel}.`
            );
            whatsOk = true;
          } catch (err) {
            console.error(`[Winback] WhatsApp falhou para ${user.email}:`, err);
          }
        }

        await pool.query(
          `UPDATE winback_offers SET push_sent = $1, email_sent = $2, whatsapp_sent = $3 WHERE id = $4`,
          [pushOk, emailOk, whatsOk, offerId]
        );

        if (pushOk) pushSent++;
        if (emailOk) emailSent++;
        if (whatsOk) whatsappSent++;
        users.push({ userId: user.id, companyName: user.company_name, push: pushOk, email: emailOk, whatsapp: whatsOk });
      }

      res.json({
        success: true,
        data: { total: eligible.length, offersCreated: eligible.length, pushSent, emailSent, whatsappSent, users },
      });
    } catch (error) {
      console.error('[Winback] Send campaign error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Lista ofertas win-back com status para acompanhamento.
   * GET /api/admin/winback
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT w.id, w.user_id, w.discount_percent, w.status, w.expires_at,
                w.push_sent, w.email_sent, w.whatsapp_sent, w.redeemed_at, w.created_at,
                u.company_name, u.email, u.is_premium, u.premium_until
         FROM winback_offers w
         JOIN users u ON u.id = w.user_id
         ORDER BY w.created_at DESC
         LIMIT 200`
      );
      const data = result.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        companyName: r.company_name,
        email: r.email,
        discountPercent: r.discount_percent,
        // Oferta ativa já vencida aparece como 'expired' sem precisar de cron
        status: r.status === 'active' && new Date(r.expires_at) <= new Date() ? 'expired' : r.status,
        expiresAt: r.expires_at,
        pushSent: r.push_sent,
        emailSent: r.email_sent,
        whatsappSent: r.whatsapp_sent,
        redeemedAt: r.redeemed_at,
        createdAt: r.created_at,
        isPremiumNow: r.is_premium,
      }));
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Winback] List error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
