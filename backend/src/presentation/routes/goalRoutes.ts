import { Router } from 'express';
import { GoalController } from '../controllers/GoalController';

const router = Router();
const controller = new GoalController();

router.get('/:month/:year', (req, res) => controller.get(req, res));
router.put('/:month/:year', (req, res) => controller.upsert(req, res));

export default router;
