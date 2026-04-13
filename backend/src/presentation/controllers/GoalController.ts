import { Request, Response } from 'express';
import { PostgresGoalRepository } from '../../infrastructure/repositories/PostgresGoalRepository';

const repo = new PostgresGoalRepository();

export class GoalController {
  async get(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      if (isNaN(month) || isNaN(year)) {
        res.status(400).json({ success: false, message: 'month e year devem ser números' });
        return;
      }
      const goal = await repo.findByMonthYear(userId, month, year);
      res.json({ success: true, data: goal });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao buscar meta' });
    }
  }

  async upsert(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      const { amount } = req.body;
      if (isNaN(month) || isNaN(year) || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ success: false, message: 'Dados inválidos' });
        return;
      }
      const goal = await repo.upsert(userId, amount, month, year);
      res.json({ success: true, data: goal });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Erro ao salvar meta' });
    }
  }
}
