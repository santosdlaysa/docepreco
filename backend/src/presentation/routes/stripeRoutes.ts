import { Router } from 'express';
import { StripeController } from '../controllers/StripeController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new StripeController();

// Mobile: authenticated user creates a checkout session
router.post('/stripe/create-checkout', authMiddleware, (req, res) => controller.createCheckout(req as any, res));

// Stripe calls this after payment — needs raw body (registered before express.json in server.ts)
router.post('/stripe/webhook', (req, res) => controller.webhook(req, res));

// Browser redirect pages after checkout
router.get('/stripe/success', (req, res) => controller.success(req, res));
router.get('/stripe/cancel', (req, res) => controller.cancel(req, res));

export default router;
