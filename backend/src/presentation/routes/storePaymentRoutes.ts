import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { requireTier } from '../middleware/requireTier';
import { RECEIVING_TERMS_VERSION, validPaymentSignature } from '../../domain/services/storePaymentRules';
import { receivingStatus, startReceivingConnection, finishReceivingConnection, enableReceiving,
  paymentConfig, syncStorePayment, refundStoreOrder, reconcileStoreOrder, cancelExpiredCheckout } from '../../infrastructure/services/storePaymentService';

const router = Router();
const handle = (fn: (req: AuthRequest, res: Response) => Promise<void>) => (req: Request, res: Response, _next: NextFunction) => {
  fn(req, res).catch(error => {
    console.error('[Store payments]', error instanceof Error ? error.message : 'Operation failed');
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Não foi possível concluir a operação.' });
  });
};
router.get('/store/receiving', authMiddleware, handle(async (req, res) => {
  res.json({ success: true, data: await receivingStatus(req.userId!) });
}));
router.post('/store/receiving/connect', authMiddleware, requireTier('master'), handle(async (req, res) => {
  if (req.body?.acceptedTerms !== RECEIVING_TERMS_VERSION) throw new Error('Leia e aceite as condições de recebimento antes de conectar.');
  res.json({ success: true, data: { url: await startReceivingConnection(req.userId!) } });
}));
router.put('/store/receiving', authMiddleware, requireTier('master'), handle(async (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') throw new Error('Configuração inválida');
  if (req.body.enabled && req.body.acceptedTerms !== RECEIVING_TERMS_VERSION) throw new Error('Aceite as condições para ativar.');
  await enableReceiving(req.userId!, req.body.enabled);
  res.json({ success: true, data: await receivingStatus(req.userId!) });
}));
router.get('/store/receiving/payments', authMiddleware, handle(async (req, res) => {
  const { rows } = await pool.query(`SELECT p.order_id,p.status,p.amount_cents,p.fee_cents,p.processing_fee_cents,p.refunded_cents,o.order_number
    FROM store_order_payments p JOIN orders o ON o.id=p.order_id WHERE p.user_id=$1 ORDER BY p.updated_at DESC LIMIT 50`, [req.userId]);
  res.json({ success: true, data: rows });
}));
// Refund access remains available after plan expiration.
router.post('/store/receiving/payments/:id/refund', authMiddleware, handle(async (req, res) => {
  await refundStoreOrder(req.params.id, req.userId!);
  res.json({ success: true, data: { refunded: true } });
}));
router.post('/store/receiving/payments/:id/reconcile', authMiddleware, handle(async (req, res) => {
  await reconcileStoreOrder(req.params.id, req.userId!);
  res.json({ success: true, data: { checked: true } });
}));
router.post('/store/receiving/payments/:id/cancel', authMiddleware, handle(async (req, res) => {
  await cancelExpiredCheckout(req.params.id, req.userId!);
  res.json({ success: true, data: { cancelled: true } });
}));
router.get('/store-payments/oauth/callback', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  try {
    if (typeof req.query.state !== 'string' || typeof req.query.code !== 'string') throw new Error('Autorização cancelada');
    await finishReceivingConnection(req.query.state, req.query.code);
    res.type('html').send('<meta charset="utf-8"><title>Conta conectada</title><h1>Conta Mercado Pago conectada</h1><p>Volte ao DocePreço, atualize o status e ative o checkout online nas configurações de recebimento.</p><p>O dinheiro da loja será recebido nesta conta Mercado Pago, sujeito às tarifas e aos prazos do provedor. A taxa de serviço será destinada ao DocePreço.</p>');
  } catch {
    res.status(400).type('html').send('<meta charset="utf-8"><h1>Não foi possível conectar a conta</h1><p>Volte ao DocePreço e tente novamente. Caso já tenha uma conta vinculada, autorize a mesma conta. Confira também as pendências cadastrais no Mercado Pago.</p>');
  }
});
router.post('/store-payments/webhook', async (req, res) => {
  const id = typeof req.query['data.id'] === 'string' ? req.query['data.id'] : '';
  if (!validPaymentSignature(id, req.get('x-request-id') ?? '', req.get('x-signature') ?? '', process.env.MP_MARKETPLACE_WEBHOOK_SECRET ?? '')) {
    res.sendStatus(401); return;
  }
  if (req.body?.type !== 'payment') { res.sendStatus(200); return; }
  if (String(req.body?.data?.id) !== id || !/^\d+$/.test(id) || !/^\d+$/.test(String(req.body.user_id))) { res.sendStatus(400); return; }
  try { await syncStorePayment(id, String(req.body.user_id)); res.sendStatus(200); }
  catch { res.sendStatus(503); } // provider retries; never acknowledge an unprocessed payment
});
router.get('/admin/store-payments', adminMiddleware, handle(async (_req, res) => {
  const config = await paymentConfig();
  const { rows } = await pool.query(`SELECT p.order_id,p.status,p.amount_cents,p.fee_cents,p.processing_fee_cents,p.refunded_cents,s.store_name
    FROM store_order_payments p JOIN store_settings s ON s.user_id=p.user_id ORDER BY p.updated_at DESC LIMIT 100`);
  res.json({ success: true, data: { ...config, payments: rows } });
}));
router.put('/admin/store-payments', adminMiddleware, handle(async (req, res) => {
  const { enabled, feeCents } = req.body ?? {};
  if (typeof enabled !== 'boolean' || !Number.isInteger(feeCents) || feeCents < 0 || feeCents > 100000) throw new Error('Informe uma taxa válida em centavos.');
  if (enabled && !(await paymentConfig()).ready) throw new Error('Configure as credenciais do marketplace no servidor antes de liberar.');
  await pool.query('UPDATE store_payment_config SET enabled=$1,fee_cents=$2 WHERE id=TRUE', [enabled, feeCents]);
  res.json({ success: true, data: await paymentConfig() });
}));
export default router;
