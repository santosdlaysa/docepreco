import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresStockRepository } from '../../infrastructure/repositories/PostgresStockRepository';

const repo = new PostgresStockRepository();

export class StockController {
  async getState(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await repo.getState(req.userId!);
      res.json({ success: true, data });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async setQuantity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ingredientId = req.params.ingredientId;
      const { quantity, minQuantity, unit } = req.body;
      if (quantity == null || !unit) {
        res.status(400).json({ success: false, error: 'quantity e unit são obrigatórios' });
        return;
      }
      const item = await repo.setQuantity(
        req.userId!,
        ingredientId,
        Number(quantity),
        Number(minQuantity ?? 0),
        unit
      );
      res.json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async addEntry(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ingredientId = req.params.ingredientId;
      const { quantity, unit, reason } = req.body;
      if (quantity == null || Number(quantity) <= 0 || !unit) {
        res.status(400).json({ success: false, error: 'quantity (> 0) e unit são obrigatórios' });
        return;
      }
      const item = await repo.addEntry(req.userId!, ingredientId, Number(quantity), unit, reason);
      res.json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async deduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const lowStock = await repo.deduct(req.userId!, items);
      res.json({ success: true, data: { lowStock } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
