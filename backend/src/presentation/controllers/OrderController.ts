import { Request, Response } from 'express';
import { PostgresOrderRepository } from '../../infrastructure/repositories/PostgresOrderRepository';

const repo = new PostgresOrderRepository();

export class OrderController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const orders = await repo.findAll(userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar encomendas' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const order = await repo.findById(req.params.id, userId);
      if (!order) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao buscar encomenda' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const b = req.body ?? {};
      if (!b.clientName || !b.recipeName || !b.deliveryDate) {
        res.status(400).json({ success: false, message: 'Dados inválidos' });
        return;
      }
      const order = await repo.create(userId, b);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao criar encomenda' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const order = await repo.update(req.params.id, userId, req.body ?? {});
      if (!order) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar encomenda' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const deleted = await repo.delete(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Encomenda não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: 'Erro ao excluir encomenda' });
    }
  }
}
