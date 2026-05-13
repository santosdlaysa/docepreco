import { Router } from 'express';
import { SuggestionController } from '../controllers/SuggestionController';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new SuggestionController();

// User (mobile) - enviar sugestão
router.post('/', authMiddleware, (req, res) => controller.create(req, res));

// Admin
router.get('/', adminMiddleware, (req, res) => controller.getAll(req, res));
router.put('/:id', adminMiddleware, (req, res) => controller.updateStatus(req, res));
router.post('/:id/note', adminMiddleware, (req, res) => controller.addNote(req, res));
router.delete('/:id', adminMiddleware, (req, res) => controller.remove(req, res));

export default router;
