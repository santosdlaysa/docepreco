import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { authLimiter, loginLimiter, resetLimiter } from '../middleware/rateLimiter';
import { loginLockout } from '../middleware/loginLockout';

const router = Router();
const controller = new AuthController();

router.post('/register', authLimiter, (req, res) => controller.register(req, res));
router.post('/login', loginLimiter, loginLockout, (req, res) => controller.login(req, res));
router.post('/forgot-password', authLimiter, (req, res) => controller.forgotPassword(req, res));
router.post('/reset-password', resetLimiter, (req, res) => controller.resetPassword(req, res));
router.post('/web-handoff', authMiddleware, (req, res) => controller.webHandoff(req as any, res));
router.post('/web-handoff/exchange', authLimiter, (req, res) => controller.webHandoffExchange(req, res));
router.get('/me', authMiddleware, (req, res) => controller.me(req as any, res));
router.patch('/profile', authMiddleware, (req, res) => controller.updateProfile(req as any, res));
router.post('/accept-lgpd', authMiddleware, (req, res) => controller.acceptLgpd(req as any, res));
router.post('/change-password', authMiddleware, (req, res) => controller.changePassword(req as any, res));
router.post('/suggestion', authMiddleware, (req, res) => controller.sendSuggestion(req as any, res));
router.delete('/account', authMiddleware, (req, res) => controller.deleteAccount(req as any, res));

export default router;
