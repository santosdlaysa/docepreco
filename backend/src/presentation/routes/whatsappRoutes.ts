import { Router, Request, Response } from 'express';
import { adminMiddleware } from '../middleware/adminMiddleware';
import {
  createInstance,
  getQrCode,
  getInstanceStatus,
  sendWhatsAppMessage,
} from '../../infrastructure/services/whatsappService';

const router = Router();

router.use(adminMiddleware);

// Criar instância (só precisa uma vez)
router.post('/instance', async (_req: Request, res: Response) => {
  try {
    const result = await createInstance();
    res.json({ data: result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao criar instância' });
  }
});

// QR Code para conectar o WhatsApp
router.get('/qrcode', async (_req: Request, res: Response) => {
  try {
    const result = await getQrCode();
    res.json({ data: result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao obter QR code' });
  }
});

// Status da conexão
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const result = await getInstanceStatus();
    res.json({ data: result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao verificar status' });
  }
});

// Enviar mensagem
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      res.status(400).json({ error: 'phone e message são obrigatórios' });
      return;
    }
    const result = await sendWhatsAppMessage(phone, message);
    res.json({ data: result });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao enviar mensagem' });
  }
});

export default router;
