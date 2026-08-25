import { Request, Response } from 'express';
import { PostgresFeedbackRepository } from '../../infrastructure/repositories/PostgresFeedbackRepository';
import { pool } from '../../infrastructure/database/connection';

const repo = new PostgresFeedbackRepository();

export class FeedbackController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar feedbacks' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { message, rating } = req.body;
      const userId = (req as Request & { userId?: string }).userId;
      if (!userId || typeof message !== 'string' || !message.trim() || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        res.status(400).json({ success: false, error: 'message e rating (de 1 a 5) são obrigatórios' });
        return;
      }
      const userResult = await pool.query('SELECT company_name, email FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      const item = await repo.create({
        userId,
        userName: req.body.userName ?? user?.company_name ?? '',
        userEmail: req.body.userEmail ?? user?.email ?? '',
        message: message.trim(),
        rating: Number(rating),
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar feedback' });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!['pending', 'read', 'replied'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status inválido' });
        return;
      }
      const item = await repo.updateStatus(req.params.id, status);
      if (!item) { res.status(404).json({ success: false, error: 'Feedback não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
    }
  }

  async reply(req: Request, res: Response): Promise<void> {
    try {
      const { reply } = req.body;
      if (!reply) { res.status(400).json({ success: false, error: 'reply é obrigatório' }); return; }
      const item = await repo.reply(req.params.id, reply);
      if (!item) { res.status(404).json({ success: false, error: 'Feedback não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao responder feedback' });
    }
  }
}
