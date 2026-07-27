import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new ClientController();

router.get('/clients', authMiddleware, (req, res) => controller.getAll(req as any, res));
router.post('/clients', authMiddleware, (req, res) => controller.create(req as any, res));
router.put('/clients/:id', authMiddleware, (req, res) => controller.update(req as any, res));
router.delete('/clients/:id', authMiddleware, (req, res) => controller.delete(req as any, res));

export default router;
