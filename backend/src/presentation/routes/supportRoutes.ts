import { Router } from 'express';
import { SupportController } from '../controllers/SupportController';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new SupportController();

// User (mobile) routes
router.get('/messages', authMiddleware, (req, res) => controller.getMessages(req, res));
router.post('/messages', authMiddleware, (req, res) => controller.sendMessage(req, res));
router.get('/unread', authMiddleware, (req, res) => controller.getUnreadCount(req, res));

// Admin routes
router.get('/admin/conversations', adminMiddleware, (req, res) => controller.adminGetConversations(req, res));
router.get('/admin/conversations/:userId', adminMiddleware, (req, res) => controller.adminGetMessages(req, res));
router.post('/admin/conversations/:userId', adminMiddleware, (req, res) => controller.adminSendMessage(req, res));
router.get('/admin/unread', adminMiddleware, (req, res) => controller.adminGetUnreadCount(req, res));

export default router;
