import { Router } from 'express';
import { WebPushController } from '../controllers/WebPushController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new WebPushController();

router.get('/public-key', (req, res) => controller.publicKey(req, res));
router.post('/subscription', authMiddleware, (req, res) => controller.subscribe(req, res));
router.delete('/subscription', authMiddleware, (req, res) => controller.unsubscribe(req, res));

export default router;
