import { Router } from 'express';
import { StockController } from '../controllers/StockController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new StockController();

router.get('/stock', authMiddleware, (req, res) => controller.getState(req as any, res));
router.post('/stock/deduct', authMiddleware, (req, res) => controller.deduct(req as any, res));
router.post('/stock/:ingredientId/entry', authMiddleware, (req, res) => controller.addEntry(req as any, res));
router.put('/stock/:ingredientId', authMiddleware, (req, res) => controller.setQuantity(req as any, res));

export default router;
