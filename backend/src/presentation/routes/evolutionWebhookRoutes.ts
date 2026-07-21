import { Router, Request, Response } from 'express';
import { recordMessageUpdate } from '../../infrastructure/services/whatsappService';

const router = Router();

router.post('/webhooks/evolution', (req: Request, res: Response) => {
  recordMessageUpdate(req.body);
  res.status(200).json({ received: true });
});

export default router;
