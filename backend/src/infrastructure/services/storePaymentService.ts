import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { pool } from '../database/connection';
import { cents, assertPaymentMatches, RECEIVING_TERMS_VERSION } from '../../domain/services/storePaymentRules';
import { removeSalesForOrder } from '../../application/services/OrderSaleAutomation';

const API = 'https://api.mercadopago.com';
function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Recebimentos online ainda não configurados pela plataforma');
  return value;
}
export function paymentEnvironmentReady(): boolean {
  return ['MP_MARKETPLACE_CLIENT_ID', 'MP_MARKETPLACE_CLIENT_SECRET', 'MP_MARKETPLACE_REDIRECT_URI',
    'MP_MARKETPLACE_WEBHOOK_SECRET', 'MP_MARKETPLACE_WEBHOOK_URL', 'STORE_CHECKOUT_BASE_URL']
    .every(k => Boolean(process.env[k])) && /^[a-f0-9]{64}$/i.test(process.env.MP_MARKETPLACE_ENCRYPTION_KEY ?? '');
}
function key(): Buffer {
  const value = env('MP_MARKETPLACE_ENCRYPTION_KEY');
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('Chave de criptografia inválida');
  return Buffer.from(value, 'hex');
}
export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
}
export function decryptToken(value: string): string {
  const [iv, tag, data] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
async function mp(path: string, token?: string, body?: unknown, idempotencyKey?: string): Promise<any> {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Mercado Pago indisponível para esta operação (${response.status}). Confira a conexão e tente novamente.`);
  return response.json();
}
export async function paymentConfig() {
  const { rows } = await pool.query('SELECT enabled, fee_cents FROM store_payment_config WHERE id = TRUE');
  return { enabled: rows[0]?.enabled === true, feeCents: Number(rows[0]?.fee_cents ?? 0), ready: paymentEnvironmentReady() };
}
export async function receivingStatus(userId: string) {
  const [config, account] = await Promise.all([paymentConfig(), pool.query(
    'SELECT collector_id, enabled, consent_at, terms_version FROM store_payment_accounts WHERE user_id = $1', [userId])]);
  const row = account.rows[0];
  return { configured: config.ready, platformEnabled: config.enabled, connected: Boolean(row),
    enabled: row?.enabled === true, accountId: row?.collector_id ?? null, feeCents: config.feeCents,
    consentAt: row?.consent_at ?? null, termsVersion: RECEIVING_TERMS_VERSION };
}
export async function publicReceiving(userId: string) {
  const status = await receivingStatus(userId);
  return { available: status.configured && status.platformEnabled && status.connected && status.enabled,
    feeCents: status.feeCents };
}
export async function startReceivingConnection(userId: string): Promise<string> {
  if (!paymentEnvironmentReady()) throw new Error('A plataforma ainda está configurando os recebimentos online.');
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(48).toString('base64url');
  await pool.query('DELETE FROM store_payment_oauth_states WHERE expires_at < NOW() OR user_id = $1', [userId]);
  await pool.query(`INSERT INTO store_payment_oauth_states VALUES ($1,$2,$3,NOW() + INTERVAL '10 minutes')`,
    [createHash('sha256').update(state).digest('hex'), userId, encryptToken(verifier)]);
  const params = new URLSearchParams({ client_id: env('MP_MARKETPLACE_CLIENT_ID'), response_type: 'code', platform_id: 'mp',
    redirect_uri: env('MP_MARKETPLACE_REDIRECT_URI'), state, code_challenge_method: 'S256',
    code_challenge: createHash('sha256').update(verifier).digest('base64url') });
  return `https://auth.mercadopago.com.br/authorization?${params}`;
}
export async function finishReceivingConnection(state: string, code: string): Promise<void> {
  const result = await pool.query('DELETE FROM store_payment_oauth_states WHERE state_hash = $1 AND expires_at > NOW() RETURNING *',
    [createHash('sha256').update(state).digest('hex')]);
  if (!result.rows[0]) throw new Error('Autorização expirada. Volte à loja e conecte novamente.');
  const row = result.rows[0];
  const token = await mp('/oauth/token', undefined, { grant_type: 'authorization_code', client_id: env('MP_MARKETPLACE_CLIENT_ID'),
    client_secret: env('MP_MARKETPLACE_CLIENT_SECRET'), redirect_uri: env('MP_MARKETPLACE_REDIRECT_URI'), code,
    code_verifier: decryptToken(row.verifier) });
  if (!token.access_token || !token.refresh_token || !token.user_id || !Number.isFinite(token.expires_in)) throw new Error('Autorização inválida');
  // Never replace a different receiver: old payments must remain accessible for refunds.
  const existing = await pool.query('SELECT collector_id FROM store_payment_accounts WHERE user_id = $1', [row.user_id]);
  if (existing.rows[0] && existing.rows[0].collector_id !== String(token.user_id)) throw new Error('Reconecte a mesma conta Mercado Pago já vinculada à loja.');
  await pool.query(`INSERT INTO store_payment_accounts (user_id,collector_id,access_token,refresh_token,expires_at,consent_at,terms_version)
    VALUES ($1,$2,$3,$4,NOW() + $5 * INTERVAL '1 second',NOW(),$6)
    ON CONFLICT (user_id) DO UPDATE SET access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
      expires_at=EXCLUDED.expires_at,consent_at=NOW(),terms_version=EXCLUDED.terms_version`,
    [row.user_id, String(token.user_id), encryptToken(token.access_token), encryptToken(token.refresh_token), token.expires_in, RECEIVING_TERMS_VERSION]);
}
export async function sellerToken(userId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM store_payment_accounts WHERE user_id=$1 FOR UPDATE', [userId]);
    const row = rows[0];
    if (!row) throw new Error('A loja precisa conectar sua conta Mercado Pago.');
    if (new Date(row.expires_at).getTime() > Date.now() + 60000) {
      await client.query('COMMIT');
      return decryptToken(row.access_token);
    }
    const token = await mp('/oauth/token', undefined, { grant_type: 'refresh_token', client_id: env('MP_MARKETPLACE_CLIENT_ID'),
      client_secret: env('MP_MARKETPLACE_CLIENT_SECRET'), refresh_token: decryptToken(row.refresh_token) });
    if (!token.access_token || !token.refresh_token || String(token.user_id) !== row.collector_id) throw new Error('Reconecte sua conta Mercado Pago.');
    await client.query(`UPDATE store_payment_accounts SET access_token=$2,refresh_token=$3,expires_at=NOW()+$4*INTERVAL '1 second' WHERE user_id=$1`,
      [userId, encryptToken(token.access_token), encryptToken(token.refresh_token), token.expires_in]);
    await client.query('COMMIT');
    return token.access_token;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function enableReceiving(userId: string, enabled: boolean): Promise<void> {
  if (enabled) {
    if (!paymentEnvironmentReady()) throw new Error('Recebimentos indisponíveis na plataforma');
    const profile = await mp('/users/me', await sellerToken(userId));
    if (profile.site_id !== 'MLB' || profile.status?.site_status !== 'active' || profile.status?.mercadopago_account_type === 'not_accepted') {
      throw new Error('Regularize o cadastro da conta brasileira no Mercado Pago antes de ativar.');
    }
  }
  const result = await pool.query('UPDATE store_payment_accounts SET enabled=$2 WHERE user_id=$1', [userId, enabled]);
  if (!result.rowCount) throw new Error('Conecte sua conta Mercado Pago primeiro.');
}
export async function createStoreCheckout(orderId: string): Promise<string> {
  const payment = await pool.query('SELECT user_id FROM store_order_payments WHERE order_id=$1', [orderId]);
  if (!payment.rows[0]) throw new Error('Pagamento não encontrado');
  const token = await sellerToken(payment.rows[0].user_id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT p.*,o.status AS order_status,s.slug FROM store_order_payments p
      JOIN orders o ON o.id=p.order_id JOIN store_settings s ON s.user_id=p.user_id WHERE p.order_id=$1 FOR UPDATE OF p,o`, [orderId]);
    const p = rows[0];
    if (p.status !== 'pending' || p.order_status === 'cancelled' || new Date(p.expires_at).getTime() <= Date.now()) throw new Error('Este pagamento não está mais disponível.');
    if (p.checkout_url) { await client.query('COMMIT'); return p.checkout_url; }
    const back = `${env('STORE_CHECKOUT_BASE_URL').replace(/\/$/, '')}/${encodeURIComponent(p.slug)}?paymentOrder=${orderId}`;
    const preference = await mp('/checkout/preferences', token, {
      items: [{ id: orderId, title: 'Pedido na loja', quantity: 1, currency_id: 'BRL', unit_price: (p.amount_cents - p.fee_cents) / 100 },
        ...(p.fee_cents ? [{ id: 'service-fee', title: 'Taxa de serviço DocePreço', quantity: 1, currency_id: 'BRL', unit_price: p.fee_cents / 100 }] : [])],
      marketplace_fee: p.fee_cents / 100, external_reference: orderId,
      notification_url: env('MP_MARKETPLACE_WEBHOOK_URL'), back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved', expires: true, expiration_date_to: new Date(p.expires_at).toISOString(),
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
    }, orderId);
    const url = new URL(preference.init_point);
    if (url.protocol !== 'https:' || !/(^|\.)mercadopago\.com\.br$/.test(url.hostname)) throw new Error('Checkout inválido');
    await client.query('UPDATE store_order_payments SET preference_id=$2,checkout_url=$3 WHERE order_id=$1', [orderId, preference.id, url.toString()]);
    await client.query('COMMIT');
    return url.toString();
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function syncStorePayment(paymentId: string, collectorId: string): Promise<void> {
  const account = await pool.query('SELECT user_id FROM store_payment_accounts WHERE collector_id=$1', [collectorId]);
  if (!account.rows[0]) return;
  const userId = account.rows[0].user_id;
  const payment = await mp(`/v1/payments/${encodeURIComponent(paymentId)}`, await sellerToken(userId));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT p.*,o.status AS order_status FROM store_order_payments p JOIN orders o ON o.id=p.order_id
      WHERE p.order_id::text=$1 AND p.user_id=$2 FOR UPDATE OF p,o`, [payment.external_reference, userId]);
    const p = rows[0];
    if (!p) { await client.query('COMMIT'); return; }
    assertPaymentMatches(payment, p);
    const duplicate = p.payment_id && p.payment_id !== String(payment.id);
    if (duplicate || (p.order_status === 'cancelled' && payment.status === 'approved')) {
      await client.query('ROLLBACK');
      // A late approval or second payment must never fund a cancelled/paid order twice.
      if (payment.status === 'approved') await mp(`/v1/payments/${payment.id}/refunds`, await sellerToken(userId), {}, `automatic-refund-${payment.id}`);
      return;
    }
    // Failed attempts must not prevent a later successful attempt on the preference.
    if (!['approved', 'refunded', 'charged_back'].includes(payment.status)) { await client.query('COMMIT'); return; }
    const refunded = cents(Number(payment.transaction_amount_refunded ?? 0));
    const processing = (payment.fee_details ?? []).filter((f: any) => f.type !== 'application_fee')
      .reduce((sum: number, f: any) => sum + cents(Number(f.amount)), 0);
    const reversed = payment.status === 'refunded' || payment.status === 'charged_back';
    const amountPaid = reversed ? 0 : Math.max(0, p.amount_cents - refunded) / 100;
    const method = payment.payment_method_id === 'pix' ? 'pix' : payment.payment_type_id === 'debit_card' ? 'debit' : 'credit';
    await client.query(`UPDATE store_order_payments SET payment_id=$2,status=$3,processing_fee_cents=$4,refunded_cents=$5,updated_at=NOW() WHERE order_id=$1`,
      [p.order_id, String(payment.id), payment.status, processing, refunded]);
    await client.query(`UPDATE orders SET paid=$2,paid_amount=$3,payments=$4,payment_method=$5,
      status=CASE WHEN $6 THEN 'cancelled' ELSE status END WHERE id=$1`,
      [p.order_id, !reversed && refunded === 0, amountPaid, JSON.stringify(amountPaid ? [{ id: String(payment.id), amount: amountPaid, method, date: new Date().toISOString() }] : []), method, reversed]);
    await client.query('COMMIT');
    if (reversed) await removeSalesForOrder(p.order_id, userId);
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function refundStoreOrder(orderId: string, userId: string): Promise<void> {
  const { rows } = await pool.query('SELECT * FROM store_order_payments WHERE order_id=$1 AND user_id=$2', [orderId, userId]);
  const p = rows[0];
  if (!p?.payment_id || p.status !== 'approved') throw new Error('Só é possível estornar um pagamento aprovado.');
  await mp(`/v1/payments/${p.payment_id}/refunds`, await sellerToken(userId), {}, `refund-${orderId}`);
  await syncStorePayment(p.payment_id, p.collector_id);
}

/** Manual reconciliation also recovers notifications lost while the service was offline. */
export async function reconcileStoreOrder(orderId: string, userId: string): Promise<void> {
  const { rows } = await pool.query('SELECT * FROM store_order_payments WHERE order_id=$1 AND user_id=$2', [orderId, userId]);
  const p = rows[0];
  if (!p) throw new Error('Pagamento não encontrado');
  if (p.payment_id) { await syncStorePayment(p.payment_id, p.collector_id); return; }
  const result = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=100`, await sellerToken(userId));
  for (const payment of result.results ?? []) await syncStorePayment(String(payment.id), p.collector_id);
}

export async function cancelExpiredCheckout(orderId: string, userId: string): Promise<void> {
  const { rows } = await pool.query('SELECT * FROM store_order_payments WHERE order_id=$1 AND user_id=$2', [orderId, userId]);
  const p = rows[0];
  if (!p || p.status !== 'pending' || new Date(p.expires_at).getTime() > Date.now()) throw new Error('Aguarde o prazo de 30 minutos do checkout e consulte o pagamento antes de cancelar.');
  const result = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=100`, await sellerToken(userId));
  if (Number(result.paging?.total ?? 0) > 100) throw new Error('Confira este pedido com o suporte antes de cancelar.');
  const active = (result.results ?? []).filter((x: any) => !['rejected', 'cancelled', 'refunded', 'charged_back'].includes(x.status));
  if (active.length) {
    for (const payment of active) await syncStorePayment(String(payment.id), p.collector_id);
    throw new Error('Há um pagamento aprovado ou em processamento. Atualize o status; pagamentos aprovados devem ser estornados.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT p.*,o.items FROM store_order_payments p JOIN orders o ON o.id=p.order_id
      WHERE p.order_id=$1 AND p.user_id=$2 FOR UPDATE OF p,o`, [orderId,userId]);
    const current = locked.rows[0];
    if (!current || current.status !== 'pending') throw new Error('O pagamento mudou. Atualize o status.');
    if (!current.stock_released) {
      for (const item of [...(current.items ?? [])].sort((a: any, b: any) => String(a.productId).localeCompare(String(b.productId)))) {
        if (item.productId) await client.query('UPDATE store_products SET stock=stock+$1 WHERE id=$2 AND user_id=$3 AND stock IS NOT NULL', [item.quantity,item.productId,userId]);
      }
    }
    await client.query("UPDATE store_order_payments SET status='cancelled',stock_released=TRUE,updated_at=NOW() WHERE order_id=$1", [orderId]);
    await client.query("UPDATE orders SET status='cancelled' WHERE id=$1", [orderId]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
