import { Router } from 'express';
import { PushTokenController } from '../controllers/PushTokenController';

const router = Router();
const controller = new PushTokenController();

router.post('/', (req, res) => controller.register(req, res));
router.delete('/', (req, res) => controller.unregister(req, res));

export default router;
