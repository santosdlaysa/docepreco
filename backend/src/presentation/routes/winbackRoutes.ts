import { Router } from 'express';
import { WinbackController } from '../controllers/WinbackController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new WinbackController();

router.use(adminMiddleware);

router.get('/', (req, res) => controller.list(req, res));
router.get('/eligible', (req, res) => controller.listEligible(req, res));
router.post('/send', (req, res) => controller.sendCampaign(req, res));

export default router;
