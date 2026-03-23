import { Router } from 'express';
import { RecipeController } from '../controllers/RecipeController';

const router = Router();
const controller = new RecipeController();

router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.post('/:id/calculate', (req, res) => controller.calculate(req, res));

export default router;
