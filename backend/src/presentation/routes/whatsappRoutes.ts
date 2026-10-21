import { Router, Request, Response } from 'express';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { WhatsAppOfferController } from '../controllers/WhatsAppOfferController';
import { getMessageStatus, getWhatsAppStatus, sendWhatsAppTemplate, WhatsAppCloudApiError } from '../../infrastructure/services/whatsappService';

const router = Router();
router.use(adminMiddleware);
router.post('/discount-offer/:userId', (req, res) => new WhatsAppOfferController().prepare(req, res));

router.get('/status', (_req: Request, res: Response) => res.json({ data: getWhatsAppStatus() }));

router.post('/send-template', async (req: Request, res: Response) => {
  const { phone, templateName, languageCode, bodyParameters } = req.body as Record<string, unknown>;
  if (typeof phone !== 'string' || typeof templateName !== 'string'
    || (languageCode !== undefined && typeof languageCode !== 'string')
    || (bodyParameters !== undefined && (!Array.isArray(bodyParameters) || bodyParameters.some((value) => typeof value !== 'string')))) {
    res.status(400).json({ error: 'phone e templateName são obrigatórios; bodyParameters deve ser uma lista de textos.' });
    return;
  }
  try {
    const result = await sendWhatsAppTemplate(phone, { name: templateName, languageCode: languageCode as string | undefined, bodyParameters: bodyParameters as string[] | undefined });
    res.status(202).json({ data: result });
  } catch (error) {
    const status = error instanceof WhatsAppCloudApiError && error.status ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro ao enviar template WhatsApp.' });
  }
});

router.get('/message-status/:id', async (req: Request, res: Response) => {
  res.json({ data: await getMessageStatus(req.params.id) });
});

export default router;
