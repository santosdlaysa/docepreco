import { Router } from 'express';
import { NotificationTemplateController } from '../controllers/NotificationTemplateController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new NotificationTemplateController();

// Public (mobile)
router.get('/active', (req, res) => controller.getActive(req, res));

// Admin
router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.update(req, res));
router.post('/:id/send', adminMiddleware, (req, res) => controller.send(req, res));

export default router;
