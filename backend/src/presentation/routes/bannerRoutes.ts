import { Router } from 'express';
import { BannerController } from '../controllers/BannerController';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new BannerController();

// Public (mobile)
router.get('/active', (req, res) => controller.getActive(req, res));
router.get('/carousel', (req, res) => controller.getCarousel(req, res));
router.get('/plan', (req, res) => controller.getPlan(req, res));

// Confeitaria compra anúncio (JWT-authenticated)
router.post('/purchase', authMiddleware, (req, res) => controller.purchase(req as any, res));
router.get('/purchase/:id/status', authMiddleware, (req, res) => controller.getPurchaseStatus(req as any, res));

// Admin
router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.post('/', adminMiddleware, (req, res) => controller.create(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.update(req, res));
router.delete('/:id', adminMiddleware, (req, res) => controller.delete(req, res));

export default router;
