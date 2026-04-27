import { Router } from 'express';
import { TelegramAlertController } from '../controllers/TelegramAlertController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new TelegramAlertController();

router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.post('/', adminMiddleware, (req, res) => controller.create(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.update(req, res));
router.delete('/:id', adminMiddleware, (req, res) => controller.delete(req, res));

export default router;
