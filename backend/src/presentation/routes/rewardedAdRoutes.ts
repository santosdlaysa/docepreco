import { Router } from 'express';
import { RewardedAdController } from '../controllers/RewardedAdController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new RewardedAdController();
router.post('/recipes/start', authMiddleware, (req, res) => controller.startRecipeReward(req, res));
router.get('/recipes/:sessionId', authMiddleware, (req, res) => controller.getRecipeRewardStatus(req, res));
router.get('/ssv', (req, res) => controller.verifySsv(req, res));
export default router;
