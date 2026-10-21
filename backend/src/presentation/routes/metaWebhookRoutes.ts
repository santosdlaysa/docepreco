import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { recordMessageUpdate } from '../../infrastructure/services/whatsappService';
import { safeEqual } from '../../config/secrets';

const router = Router();

router.get('/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && typeof token === 'string' && safeEqual(token, process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN)
    && typeof challenge === 'string') {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

router.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
  const appSecret = process.env.META_APP_SECRET;
  const signature = req.header('x-hub-signature-256');
  const body = req.body;
  if (!appSecret || !signature || !Buffer.isBuffer(body)) return void res.sendStatus(403);
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(body).digest('hex')}`;
  if (!safeEqual(signature, expected)) return void res.sendStatus(403);
  try {
    await recordMessageUpdate(JSON.parse(body.toString('utf8')));
    res.sendStatus(200);
  } catch (error) {
    console.error('[WhatsApp Cloud] Webhook inválido:', error);
    res.sendStatus(400);
  }
});

export default router;
