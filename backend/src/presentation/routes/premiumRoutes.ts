import { Router } from 'express';
import { PremiumController } from '../controllers/PremiumController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new PremiumController();

// RevenueCat webhook (no auth middleware — webhook has its own Bearer secret)
router.post('/webhooks/revenuecat', (req, res) => controller.revenueCatWebhook(req, res));

// Sync premium status from mobile after purchase/restore (JWT-authenticated)
router.post('/premium/sync', authMiddleware, (req, res) => controller.syncPremium(req as any, res));

// Request trial for free users who never paid (JWT-authenticated)
router.post('/premium/trial', authMiddleware, (req, res) => controller.requestTrial(req as any, res));

// Admin manual toggle (protected by X-Admin-Secret header)
router.post('/admin/users/:id/premium', adminMiddleware, (req, res) => controller.setPremiumManually(req, res));

export default router;
