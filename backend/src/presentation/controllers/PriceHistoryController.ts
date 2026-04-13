import { Request, Response } from 'express';
import { PostgresPriceHistoryRepository } from '../../infrastructure/repositories/PostgresPriceHistoryRepository';

const repo = new PostgresPriceHistoryRepository();

export class PriceHistoryController {
  async getForIngredient(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { ingredientId } = req.params;
      const entries = await repo.findByIngredient(userId, ingredientId);
      res.json({ success: true, data: entries });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao buscar histórico' });
    }
  }

  async add(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { ingredientId } = req.params;
      const { price, purchaseQuantity, unit, recordedAt } = req.body;
      if (typeof price !== 'number' || typeof purchaseQuantity !== 'number' || !unit) {
        res.status(400).json({ success: false, message: 'Dados inválidos' });
        return;
      }
      const entry = await repo.add(userId, ingredientId, { price, purchaseQuantity, unit, recordedAt });
      res.status(201).json({ success: true, data: entry });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao salvar histórico' });
    }
  }
}
