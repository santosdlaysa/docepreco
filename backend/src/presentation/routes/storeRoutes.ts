import { Router } from 'express';
import { StoreController } from '../controllers/StoreController';

const router = Router();
const controller = new StoreController();

router.get('/my',                (req, res) => controller.getMyStore(req as any, res));
router.patch('/my',              (req, res) => controller.updateMyStore(req as any, res));
router.get('/settings',          (req, res) => controller.getSettings(req as any, res));
router.put('/settings',          (req, res) => controller.updateSettings(req as any, res));
router.get('/products',          (req, res) => controller.getProducts(req as any, res));
router.post('/products',         (req, res) => controller.createProduct(req as any, res));
router.put('/products/:id',      (req, res) => controller.updateProduct(req as any, res));
router.delete('/products/:id',   (req, res) => controller.deleteProduct(req as any, res));
router.get('/addons',            (req, res) => controller.getAddons(req as any, res));
router.post('/addons',           (req, res) => controller.createAddon(req as any, res));
router.put('/addons/:id',        (req, res) => controller.updateAddon(req as any, res));
router.delete('/addons/:id',     (req, res) => controller.deleteAddon(req as any, res));

export default router;
