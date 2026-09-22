import { createHmac, timingSafeEqual } from 'crypto';

export const RECEIVING_TERMS_VERSION = '2026-09-v1';

export function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Valor de pagamento inválido');
  const result = Math.round(value * 100);
  if (!Number.isSafeInteger(result)) throw new Error('Valor de pagamento inválido');
  return result;
}

export function validPaymentSignature(id: string, requestId: string, signature: string, secret: string): boolean {
  const parts = Object.fromEntries(signature.split(',').map(p => p.trim().split('=')));
  if (!id || !requestId || !secret || !/^\d+$/.test(parts.ts ?? '') || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? '')) return false;
  const expected = createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'));
}

export function assertPaymentMatches(payment: any, order: { order_id: string; collector_id: string; amount_cents: number; fee_cents: number }): void {
  const commission = (payment.fee_details ?? []).filter((f: any) => f.type === 'application_fee')
    .reduce((sum: number, f: any) => sum + cents(Number(f.amount)), 0);
  if (payment.external_reference !== order.order_id || String(payment.collector_id) !== order.collector_id ||
      payment.currency_id !== 'BRL' || cents(Number(payment.transaction_amount)) !== order.amount_cents ||
      (payment.status === 'approved' && commission !== order.fee_cents)) {
    throw new Error('Pagamento não corresponde ao pedido');
  }
}
