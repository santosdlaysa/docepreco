import { Router } from 'express';
import { StoreController } from '../controllers/StoreController';
import { requireTier } from '../middleware/requireTier';

const router = Router();
const controller = new StoreController();

// Escrita exige plano Master vigente (a Loja Online é exclusiva do Master) —
// o paywall do app é só UI; a validação de verdade é aqui. Leitura fica livre
// para o painel conseguir mostrar o estado da loja a quem não é Master / expirou.
const masterOnly = requireTier('master');

router.get('/my',                          (req, res) => controller.getMyStore(req as any, res));
router.patch('/my',              masterOnly, (req, res) => controller.updateMyStore(req as any, res));
router.get('/settings',                    (req, res) => controller.getSettings(req as any, res));
router.put('/settings',          masterOnly, (req, res) => controller.updateSettings(req as any, res));
router.get('/products',                    (req, res) => controller.getProducts(req as any, res));
router.post('/products',         masterOnly, (req, res) => controller.createProduct(req as any, res));
router.put('/products/:id',      masterOnly, (req, res) => controller.updateProduct(req as any, res));
router.delete('/products/:id',   masterOnly, (req, res) => controller.deleteProduct(req as any, res));
router.get('/addons',                      (req, res) => controller.getAddons(req as any, res));
router.post('/addons',           masterOnly, (req, res) => controller.createAddon(req as any, res));
router.put('/addons/:id',        masterOnly, (req, res) => controller.updateAddon(req as any, res));
router.delete('/addons/:id',     masterOnly, (req, res) => controller.deleteAddon(req as any, res));

export default router;
