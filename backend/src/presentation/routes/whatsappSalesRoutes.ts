import { Router } from 'express';
import crypto from 'crypto';
import { PoolClient } from 'pg';
import rateLimit from 'express-rate-limit';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';
import { normalizeWhatsAppPhone } from '../../domain/services/whatsappSale';
import { getWhatsAppStatus } from '../../infrastructure/services/whatsappService';

export function whatsappSalesEnabled(): boolean {
  return process.env.WHATSAPP_SALES_ENABLED === 'true' && getWhatsAppStatus().state === 'configured';
}

const router = Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 30,
  keyGenerator: req => (req as AuthRequest).userId || req.ip || 'anonymous',
  message: { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' } }));

router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT phone, linked_at FROM whatsapp_sale_links WHERE user_id=$1', [req.userId]);
    res.json({ success: true, data: { enabled: whatsappSalesEnabled(), phone: result.rows[0]?.phone ?? null,
      businessPhone: process.env.WHATSAPP_SALES_PHONE?.replace(/\D/g, '') || null } });
  } catch { res.status(500).json({ success: false, error: 'Não foi possível consultar o vínculo.' }); }
});

router.post('/link-code', async (req: AuthRequest, res) => {
  if (!whatsappSalesEnabled()) return void res.status(503).json({ success: false, error: 'Registro pelo WhatsApp ainda não disponível.' });
  let phone: string;
  try { phone = normalizeWhatsAppPhone(req.body?.phone); }
  catch (e) { return void res.status(400).json({ success: false, error: (e as Error).message }); }
  try {
    const existing = await pool.query('SELECT 1 FROM whatsapp_sale_links WHERE user_id=$1 OR phone=$2', [req.userId, phone]);
    if (existing.rows.length) return void res.status(409).json({ success: false, error: 'Já existe um vínculo. Desvincule o WhatsApp na conta anterior antes de continuar.' });
    const code = crypto.randomBytes(12).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    await pool.query(`INSERT INTO whatsapp_link_codes(user_id,code_hash,phone,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')
      ON CONFLICT(user_id) DO UPDATE SET code_hash=$2,phone=$3,expires_at=NOW()+INTERVAL '10 minutes'`, [req.userId, hash, phone]);
    res.json({ success: true, data: { code, expiresInSeconds: 600,
      businessPhone: process.env.WHATSAPP_SALES_PHONE?.replace(/\D/g, '') || null } });
  } catch { res.status(500).json({ success: false, error: 'Não foi possível gerar o código.' }); }
});

router.delete('/', async (req: AuthRequest, res) => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const phones = await client.query(`SELECT phone FROM whatsapp_sale_links WHERE user_id=$1
      UNION SELECT phone FROM whatsapp_link_codes WHERE user_id=$1 ORDER BY phone`, [req.userId]);
    for (const row of phones.rows) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [row.phone]);
    await client.query(`UPDATE whatsapp_sale_inbox SET reply=NULL,body='',processed_at=COALESCE(processed_at,NOW()),sent_at=NOW()
      WHERE phone IN (SELECT phone FROM whatsapp_sale_links WHERE user_id=$1) AND sent_at IS NULL`, [req.userId]);
    await client.query('DELETE FROM whatsapp_sale_links WHERE user_id=$1', [req.userId]);
    await client.query('DELETE FROM whatsapp_link_codes WHERE user_id=$1', [req.userId]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch { await client?.query('ROLLBACK').catch(() => {}); res.status(500).json({ success: false, error: 'Não foi possível desvincular.' }); }
  finally { client?.release(); }
});

export default router;
