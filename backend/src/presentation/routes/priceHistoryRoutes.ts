import { Router } from 'express';
import { PriceHistoryController } from '../controllers/PriceHistoryController';

const router = Router({ mergeParams: true });
const controller = new PriceHistoryController();

router.get('/', (req, res) => controller.getForIngredient(req, res));
router.post('/', (req, res) => controller.add(req, res));

export default router;
