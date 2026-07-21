import { Router, Request, Response } from 'express';
import { adminMiddleware } from '../middleware/adminMiddleware';
import {
  createInstance,
  getQrCode,
  getInstanceStatus,
  sendWhatsAppMessage,
  resetInstanceState,
  logoutInstance,
  getMessageStatus,
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

// Reset da instância (força recriação na próxima requisição)
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    await logoutInstance();
    resetInstanceState();
    res.json({ data: 'WhatsApp desconectado. A próxima requisição irá recriar a instância e gerar um novo QR code.' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao desconectar o WhatsApp' });
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
    if (typeof message !== 'string' || message.length === 0 || message.length > 4096) {
      res.status(400).json({ error: 'Mensagem deve ter entre 1 e 4096 caracteres' });
      return;
    }
    const result = await sendWhatsAppMessage(phone, message);
    res.json({ data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao enviar mensagem';
    // Diferencia erros de validação (400) de erros do servidor (500)
    const status = msg.includes('inválido') || msg.includes('obrigatório') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

router.get('/message-status/:id', async (req: Request, res: Response) => {
  res.json({ data: getMessageStatus(req.params.id) });
});

export default router;
