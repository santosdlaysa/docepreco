import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';

const router = Router();
const controller = new StatsController();

router.get('/', (req, res) => controller.getStats(req as any, res));

export default router;
