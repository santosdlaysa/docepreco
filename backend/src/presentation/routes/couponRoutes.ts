import { Router } from 'express';
import { CouponController } from '../controllers/CouponController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new CouponController();

// Public (mobile) - validar cupom
router.get('/validate/:code', (req, res) => controller.validate(req, res));

// Admin
router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.post('/', adminMiddleware, (req, res) => controller.create(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.update(req, res));
router.delete('/:id', adminMiddleware, (req, res) => controller.delete(req, res));

export default router;
