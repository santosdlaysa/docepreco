import { Router } from 'express';
import { PixController } from '../controllers/PixController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new PixController();

// Webhook do Mercado Pago (sem autenticação — chamado diretamente pelo MP)
router.post('/pix/webhook/mercadopago', (req, res) => controller.handleWebhook(req, res));

// Página de retorno do checkout de assinatura (back_url do MP — sem autenticação)
router.get('/pix/subscription/return', (req, res) => controller.subscriptionReturn(req, res));

// Mobile endpoints (JWT-authenticated)
router.post('/pix/request', authMiddleware, (req, res) => controller.createRequest(req as any, res));
router.get('/pix/status', authMiddleware, (req, res) => controller.getStatus(req as any, res));

// Assinatura recorrente via Pix Automático
router.post('/pix/subscription', authMiddleware, (req, res) => controller.createSubscription(req as any, res));
router.get('/pix/subscription', authMiddleware, (req, res) => controller.getSubscription(req as any, res));
router.delete('/pix/subscription', authMiddleware, (req, res) => controller.cancelSubscription(req as any, res));

// Admin endpoints (protected by X-Admin-Secret)
router.get('/admin/pix-requests', adminMiddleware, (req, res) => controller.listRequests(req, res));
router.get('/admin/pix-subscriptions', adminMiddleware, (req, res) => controller.listSubscriptions(req, res));
router.post('/admin/pix-requests/:id/approve', adminMiddleware, (req, res) => controller.approveRequest(req, res));
router.post('/admin/pix-requests/:id/reject', adminMiddleware, (req, res) => controller.rejectRequest(req, res));

export default router;
