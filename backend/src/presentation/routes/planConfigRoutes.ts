import { Router } from 'express';
import { PlanConfigController } from '../controllers/PlanConfigController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new PlanConfigController();

// Public (mobile) - app can read plan config
router.get('/', (req, res) => controller.get(req, res));

// Admin
router.put('/', adminMiddleware, (req, res) => controller.update(req, res));

export default router;
