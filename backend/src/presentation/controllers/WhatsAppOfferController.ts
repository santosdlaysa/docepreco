import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';

export class WhatsAppOfferController {
  async prepare(req: Request, res: Response): Promise<void> {
    const { discountPercent, validDays } = req.body;
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 90
      || !Number.isInteger(validDays) || validDays < 1 || validDays > 60) {
      res.status(400).json({ error: 'Informe desconto de 1 a 90% e validade de 1 a 60 dias.' });
      return;
    }
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(
          `SELECT id, company_name, phone FROM users WHERE id = $1 AND is_premium = FALSE
           AND premium_until <= NOW() FOR UPDATE`, [req.params.userId]
        );
        const user = result.rows[0];
        if (!user?.phone) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'Oferta disponível apenas para ex-assinantes com plano expirado e telefone cadastrado.' });
          return;
        }
        await client.query(`UPDATE winback_offers SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`, [user.id]);
        const offer = await client.query(
          `INSERT INTO winback_offers (user_id, discount_percent, expires_at)
           VALUES ($1, $2, NOW() + $3 * INTERVAL '1 day') RETURNING id, expires_at`,
          [user.id, discountPercent, validDays]
        );
        const expiresAt = new Date(offer.rows[0].expires_at);
        const expires = expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const message = `Oi, ${user.company_name || 'tudo bem'}! 💖 Volte para o DocePreço com *${discountPercent}% de desconto no pagamento via PIX*!\n\n` +
          `Oferta válida até ${expires} (horário de Brasília), exclusiva para sua conta. Entre com seu e-mail cadastrado e gere o PIX para receber o desconto automaticamente, sem cupom.\n\n` +
          `No app, escolha *Assinar via PIX* e *Gerar QR de Pagamento*. Confira o valor com desconto no seu banco antes de pagar.`;
        await client.query('COMMIT');
        res.json({ data: { offerId: offer.rows[0].id, phone: user.phone, message, expiresAt } });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[WhatsApp] Prepare offer error:', error);
      res.status(500).json({ error: 'Não foi possível preparar a oferta de desconto.' });
    }
  }
}
