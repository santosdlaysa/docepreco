import { Router } from 'express';
import { StoreController } from '../controllers/StoreController';
import { requireTier } from '../middleware/requireTier';

const router = Router();
const controller = new StoreController();

// Escrita exige plano pago vigente (a Loja Online é recurso de assinante) —
// o paywall do app é só UI; a validação de verdade é aqui. Leitura fica livre
// para o painel conseguir mostrar o estado da loja a assinantes expirados.
const paidOnly = requireTier('premium');

router.get('/my',                          (req, res) => controller.getMyStore(req as any, res));
router.patch('/my',              paidOnly, (req, res) => controller.updateMyStore(req as any, res));
router.get('/settings',                    (req, res) => controller.getSettings(req as any, res));
router.put('/settings',          paidOnly, (req, res) => controller.updateSettings(req as any, res));
router.get('/products',                    (req, res) => controller.getProducts(req as any, res));
router.post('/products',         paidOnly, (req, res) => controller.createProduct(req as any, res));
router.put('/products/:id',      paidOnly, (req, res) => controller.updateProduct(req as any, res));
router.delete('/products/:id',   paidOnly, (req, res) => controller.deleteProduct(req as any, res));
router.get('/addons',                      (req, res) => controller.getAddons(req as any, res));
router.post('/addons',           paidOnly, (req, res) => controller.createAddon(req as any, res));
router.put('/addons/:id',        paidOnly, (req, res) => controller.updateAddon(req as any, res));
router.delete('/addons/:id',     paidOnly, (req, res) => controller.deleteAddon(req as any, res));

export default router;
