import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/authMiddleware';
import { conversionEvents, conversionSources, recordConversion } from '../../infrastructure/services/conversionService';

const router = Router();
router.post('/', rateLimit({ windowMs: 60000, max: 60 }), async (req: AuthRequest, res) => {
  const { event, source, tier, eventId } = req.body ?? {};
  if (!conversionEvents.includes(event) || !conversionSources.includes(source)
    || !['premium', 'master'].includes(tier) || typeof eventId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    res.status(400).json({ success: false, error: 'Evento inválido' });
    return;
  }
  await recordConversion(req.userId!, event, source, tier, eventId);
  res.status(202).json({ success: true });
});
export default router;
