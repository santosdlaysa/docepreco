import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/authMiddleware';
import { Router } from 'express';
import { RecipeController } from '../controllers/RecipeController';

const router = Router();
const controller = new RecipeController();

router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.post('/:id/calculate', (req, res) => controller.calculate(req, res));

const assistantLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, max: 20,
  keyGenerator: req => (req as AuthRequest).userId || req.ip || 'anonymous',
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Limite de 20 análises por dia atingido. Tente amanhã.' },
});
router.post('/:id/assistant', assistantLimiter, (req, res) => controller.assist(req, res));

export default router;
