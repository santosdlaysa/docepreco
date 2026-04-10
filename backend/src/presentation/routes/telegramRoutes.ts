import { Router, Request, Response } from 'express';
import { sendDailyUserReport } from '../../infrastructure/services/telegramService';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const message = req.body?.message;
  if (!message) return res.sendStatus(200);

  const text: string = message.text || '';

  if (text === '/relatorio' || text.startsWith('/relatorio@')) {
    await sendDailyUserReport();
  }

  res.sendStatus(200);
});

export default router;
