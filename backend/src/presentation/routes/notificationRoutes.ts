import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new NotificationController();

router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.post('/', adminMiddleware, (req, res) => controller.create(req, res));
router.post('/:id/send', adminMiddleware, (req, res) => controller.send(req, res));
router.delete('/:id', adminMiddleware, (req, res) => controller.delete(req, res));

export default router;
