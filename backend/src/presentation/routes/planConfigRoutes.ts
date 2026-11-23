import { Router } from 'express';
import { PlanConfigController } from '../controllers/PlanConfigController';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { getPixPromoConfig, isPromoLive, savePixPromo, validatePixPromo } from '../../infrastructure/services/pixPromoService';

const router = Router();
const controller = new PlanConfigController();

// Public (mobile) - app can read plan config
router.get('/', (req, res) => controller.get(req, res));

// Promoção PIX global (ex.: Black Friday) — leitura pública, escrita admin
router.get('/pix-promo', async (_req, res) => {
  try {
    const promo = await getPixPromoConfig();
    res.json({ success: true, data: { ...promo, live: isPromoLive(promo) } });
  } catch {
    res.status(500).json({ success: false, error: 'Erro ao buscar promoção' });
  }
});
router.put('/pix-promo', adminMiddleware, async (req, res) => {
  const { promo, error } = validatePixPromo(req.body);
  if (!promo) {
    res.status(400).json({ success: false, error });
    return;
  }
  try {
    await savePixPromo(promo);
    res.json({ success: true, data: { ...promo, live: isPromoLive(promo) } });
  } catch {
    res.status(500).json({ success: false, error: 'Erro ao salvar promoção' });
  }
});

// Admin
router.put('/', adminMiddleware, (req, res) => controller.update(req, res));

export default router;
