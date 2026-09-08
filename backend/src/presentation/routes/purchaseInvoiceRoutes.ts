import { Router } from 'express';
import { PurchaseInvoiceController } from '../controllers/PurchaseInvoiceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new PurchaseInvoiceController();

router.get('/purchases', authMiddleware, (req, res) => controller.getAll(req as any, res));
router.get('/purchases/:id', authMiddleware, (req, res) => controller.getById(req as any, res));
router.post('/purchases', authMiddleware, (req, res) => controller.create(req as any, res));

export default router;
