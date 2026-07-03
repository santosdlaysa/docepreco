import { Request, Response } from 'express';
import { PostgresSaleRepository } from '../../infrastructure/repositories/PostgresSaleRepository';
import { AuthRequest } from '../middleware/authMiddleware';

const saleRepo = new PostgresSaleRepository();

export class SaleController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = req.query.period as string | undefined;
      let startDate: string | undefined;

      if (period === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
      } else if (period === 'month') {
        const now = new Date();
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      }

      const sales = await saleRepo.findAll(req.userId!, startDate);
      res.json({ success: true, data: sales });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { recipeId, quantitySold, salePrice, saleDate, notes, paymentMethod } = req.body;
      if (!recipeId || !quantitySold || !salePrice || !saleDate) {
        res.status(400).json({ success: false, error: 'recipeId, quantitySold, salePrice e saleDate são obrigatórios' });
        return;
      }
      // Versões antigas do app enviavam a venda da encomenda manualmente após
      // marcá-la como entregue; o backend agora já registra essa venda sozinho.
      if (typeof notes === 'string' && notes.startsWith('Encomenda de ')) {
        const duplicate = await saleRepo.findRecentOrderLinkedDuplicate(recipeId, notes, req.userId!);
        if (duplicate) {
          res.status(201).json({ success: true, data: duplicate });
          return;
        }
      }
      const sale = await saleRepo.create(
        { recipeId, quantitySold: Number(quantitySold), salePrice: Number(salePrice), saleDate, notes, paymentMethod },
        req.userId!
      );

      res.status(201).json({ success: true, data: sale });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.locals.errorMessage = String(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await saleRepo.delete(req.params.id, req.userId!);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Sale not found' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
