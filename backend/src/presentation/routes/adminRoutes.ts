import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new AdminController();

router.use(adminMiddleware);

router.get('/stats', (req, res) => controller.getStats(req, res));
router.get('/users', (req, res) => controller.listUsers(req, res));
router.get('/users/:id', (req, res) => controller.getUser(req, res));

export default router;
