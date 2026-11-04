import { Router } from 'express';
import { CheckinController } from '../controllers/CheckinController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new CheckinController();

// Mobile endpoints (JWT-authenticated)
router.get('/checkin', authMiddleware, (req, res) => controller.getStatus(req, res));
router.post('/checkin', authMiddleware, (req, res) => controller.checkIn(req, res));

// Admin endpoints (protected by X-Admin-Secret)
router.get('/admin/checkin/config', adminMiddleware, (req, res) => controller.getConfig(req, res));
router.put('/admin/checkin/config', adminMiddleware, (req, res) => controller.updateConfig(req, res));
router.get('/admin/checkin/stats', adminMiddleware, (req, res) => controller.getStats(req, res));

export default router;
