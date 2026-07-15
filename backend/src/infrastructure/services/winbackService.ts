import { pool } from '../database/connection';

export interface WinbackOffer {
  id: string;
  userId: string;
  discountPercent: number;
  expiresAt: Date;
}

/** Oferta win-back ativa e dentro da validade para o usuário (ou null). */
export async function getActiveOffer(userId: string): Promise<WinbackOffer | null> {
  const result = await pool.query(
    `SELECT id, user_id, discount_percent, expires_at
     FROM winback_offers
     WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    discountPercent: row.discount_percent,
    expiresAt: new Date(row.expires_at),
  };
}

/** Aplica o percentual de desconto da oferta sobre um valor em centavos. */
export function applyDiscount(amountCents: number, discountPercent: number): number {
  return Math.max(0, Math.round(amountCents * (100 - discountPercent) / 100));
}

/** Vincula a oferta à solicitação PIX criada com o valor descontado. */
export async function attachPixRequest(offerId: string, pixRequestId: string): Promise<void> {
  await pool.query(
    `UPDATE winback_offers SET pix_request_id = $1 WHERE id = $2`,
    [pixRequestId, offerId]
  );
}

/** Marca como resgatada a oferta vinculada a uma pix_request aprovada. */
export async function redeemByPixRequest(pixRequestId: string): Promise<void> {
  await pool.query(
    `UPDATE winback_offers SET status = 'redeemed', redeemed_at = NOW()
     WHERE pix_request_id = $1 AND status = 'active'`,
    [pixRequestId]
  );
}
