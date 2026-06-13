import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresExpenseRepository } from '../../infrastructure/repositories/PostgresExpenseRepository';

const repo = new PostgresExpenseRepository();

export class ExpenseController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const data = await repo.findAll(req.userId!, month);
      res.json({ success: true, data });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { description, amount, category, costType, isRecurring, recurrenceDay, expenseDate, notes } = req.body;
      if (!description || amount == null || !category || !costType || !expenseDate) {
        res.status(400).json({ success: false, error: 'description, amount, category, costType e expenseDate são obrigatórios' });
        return;
      }
      const expense = await repo.create(
        { description, amount: Number(amount), category, costType, isRecurring: Boolean(isRecurring), recurrenceDay, expenseDate, notes },
        req.userId!
      );
      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const expense = await repo.update(req.params.id, req.userId!, req.body);
      if (!expense) {
        res.status(404).json({ success: false, error: 'Despesa não encontrada' });
        return;
      }
      res.json({ success: true, data: expense });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id, req.userId!);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Despesa não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const month = req.query.month as string;
      if (!month) {
        res.status(400).json({ success: false, error: 'month é obrigatório (YYYY-MM)' });
        return;
      }
      const data = await repo.getSummary(req.userId!, month);
      res.json({ success: true, data });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
