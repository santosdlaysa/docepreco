import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new ExpenseController();

router.get('/expenses/summary', authMiddleware, (req, res) => controller.getSummary(req as any, res));
router.get('/expenses', authMiddleware, (req, res) => controller.getAll(req as any, res));
router.post('/expenses', authMiddleware, (req, res) => controller.create(req as any, res));
router.put('/expenses/:id', authMiddleware, (req, res) => controller.update(req as any, res));
router.delete('/expenses/:id', authMiddleware, (req, res) => controller.delete(req as any, res));

export default router;
