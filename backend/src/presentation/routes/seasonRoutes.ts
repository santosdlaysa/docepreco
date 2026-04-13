import { Router } from 'express';
import { SeasonController } from '../controllers/SeasonController';

const router = Router();
const controller = new SeasonController();

router.get('/', (req, res) => controller.getAll(req, res));
router.get('/active', (req, res) => controller.getActive(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
