import { Router } from 'express';
import { ReferralController } from '../controllers/ReferralController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new ReferralController();

// Mobile endpoints (JWT-authenticated)
router.get('/referrals/me', authMiddleware, (req, res) => controller.getMe(req as any, res));
router.get('/referrals/progress', authMiddleware, (req, res) => controller.getProgress(req as any, res));

// Admin endpoints (protected by X-Admin-Secret)
router.get('/admin/referrals', adminMiddleware, (req, res) => controller.list(req, res));
router.get('/admin/referrals/stats', adminMiddleware, (req, res) => controller.stats(req, res));
router.post('/admin/referrals/:id/invalidate', adminMiddleware, (req, res) => controller.invalidate(req, res));
router.post('/admin/referrals/:id/force-valid', adminMiddleware, (req, res) => controller.forceValid(req, res));

export default router;
