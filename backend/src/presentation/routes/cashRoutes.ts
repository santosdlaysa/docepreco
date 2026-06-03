import { Router } from 'express';
import { CashController } from '../controllers/CashController';

const router = Router();
const controller = new CashController();

router.get('/current', (req, res) => controller.current(req, res));
router.post('/open', (req, res) => controller.open(req, res));
router.post('/close', (req, res) => controller.close(req, res));
router.post('/movements', (req, res) => controller.addMovement(req, res));
router.get('/sessions', (req, res) => controller.listSessions(req, res));

export default router;
