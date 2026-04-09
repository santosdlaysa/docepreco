import { Router } from 'express';
import { PremiumController } from '../controllers/PremiumController';

const router = Router();
const controller = new PremiumController();

// RevenueCat webhook (no auth middleware — webhook has its own Bearer secret)
router.post('/webhooks/revenuecat', (req, res) => controller.revenueCatWebhook(req, res));

// Admin manual toggle (protected by X-Admin-Secret header)
router.post('/admin/users/:id/premium', (req, res) => controller.setPremiumManually(req, res));

export default router;
