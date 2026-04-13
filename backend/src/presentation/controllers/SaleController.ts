import { Request, Response } from 'express';
import { PostgresSaleRepository } from '../../infrastructure/repositories/PostgresSaleRepository';
import { AuthRequest } from '../middleware/authMiddleware';
import { notifySale } from '../../infrastructure/services/telegramService';
import { pool } from '../../infrastructure/database/connection';

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
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { recipeId, quantitySold, salePrice, saleDate, notes } = req.body;
      if (!recipeId || !quantitySold || !salePrice || !saleDate) {
        res.status(400).json({ success: false, error: 'recipeId, quantitySold, salePrice e saleDate são obrigatórios' });
        return;
      }
      const sale = await saleRepo.create(
        { recipeId, quantitySold: Number(quantitySold), salePrice: Number(salePrice), saleDate, notes },
        req.userId!
      );

      // Telegram notification (fire-and-forget)
      pool.query(
        `SELECT u.company_name, r.name AS recipe_name FROM users u, recipes r WHERE u.id = $1 AND r.id = $2`,
        [req.userId!, recipeId]
      ).then(({ rows }) => {
        if (rows[0]) {
          notifySale(rows[0].company_name, rows[0].recipe_name, Number(quantitySold), sale.totalRevenue);
        }
      }).catch(() => {});

      res.status(201).json({ success: true, data: sale });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
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
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
