import { Router } from 'express';
import { PixController } from '../controllers/PixController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new PixController();

// Mobile endpoints (JWT-authenticated)
router.post('/pix/request', authMiddleware, (req, res) => controller.createRequest(req as any, res));
router.get('/pix/status', authMiddleware, (req, res) => controller.getStatus(req as any, res));

// Admin endpoints (protected by X-Admin-Secret)
router.get('/admin/pix-requests', adminMiddleware, (req, res) => controller.listRequests(req, res));
router.post('/admin/pix-requests/:id/approve', adminMiddleware, (req, res) => controller.approveRequest(req, res));
router.post('/admin/pix-requests/:id/reject', adminMiddleware, (req, res) => controller.rejectRequest(req, res));

export default router;
