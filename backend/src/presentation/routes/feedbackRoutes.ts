import { Router } from 'express';
import { FeedbackController } from '../controllers/FeedbackController';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new FeedbackController();

// User (mobile) - enviar feedback
router.post('/', authMiddleware, (req, res) => controller.create(req, res));

// Admin
router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.updateStatus(req, res));
router.post('/:id/reply', adminMiddleware, (req, res) => controller.reply(req, res));

export default router;
