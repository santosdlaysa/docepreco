import { pool } from '../database/connection';
import { cancelPendingMpPixPayment, getMpPaymentInfo } from './mercadoPagoService';

export const SUBSCRIPTION_PIX_TTL_MINUTES = 25;
// The Payments API requires at least 30 minutes at creation.
export const SUBSCRIPTION_MP_EXPIRATION_MINUTES = 31;

export const subscriptionPixDeadlineSql =
  `COALESCE(expires_at, created_at + INTERVAL '${SUBSCRIPTION_PIX_TTL_MINUTES} minutes')`;

// Older web requests used the same label for the static QR and the dynamic checkout.
export const subscriptionPixManualSql =
  "(manual_confirmation OR (expires_at IS NULL AND plan_label LIKE 'Plano %'))";

export async function closeUnpaidSubscriptionPix(id: string, paymentId: string): Promise<boolean> {
  const signal = AbortSignal.timeout(5000);
  const payment = await getMpPaymentInfo(paymentId, signal);
  if (payment.externalReference !== id) return false;

  // A payment being processed can still be approved. Only cancel an unpaid Pix.
  const status = payment.status === 'pending'
    ? await cancelPendingMpPixPayment(paymentId, signal)
    : payment.status;
  if (status !== 'cancelled' && status !== 'rejected') return false;

  const result = await pool.query(
    `UPDATE pix_requests SET status = 'expired', reviewed_at = NOW(), reviewed_by = 'system'
     WHERE id = $1 AND mp_payment_id = $2 AND status = 'pending'`,
    [id, paymentId]
  );
  return result.rowCount === 1;
}

export async function expireSubscriptionPixRequests(userId?: string): Promise<void> {
  const due = await pool.query<{ id: string; mp_payment_id: string }>(
    `SELECT id, mp_payment_id FROM pix_requests
     WHERE product_type = 'subscription' AND status = 'pending' AND mp_payment_id IS NOT NULL
       AND NOT ${subscriptionPixManualSql}
       AND ${subscriptionPixDeadlineSql} <= NOW()
       AND ($1::uuid IS NULL OR user_id = $1)
     ORDER BY ${subscriptionPixDeadlineSql} DESC
     LIMIT 25`,
    [userId ?? null]
  );

  await Promise.all(due.rows.map(async ({ id, mp_payment_id: paymentId }) => {
    try {
      await closeUnpaidSubscriptionPix(id, paymentId);
    } catch (error) {
      console.warn(`[PIX] Falha ao expirar a solicitação ${id}; será tentado novamente.`, error);
    }
  }));
}
