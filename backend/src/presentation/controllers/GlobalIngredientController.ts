import { Request, Response } from 'express';
import { PostgresGlobalIngredientRepository } from '../../infrastructure/repositories/PostgresGlobalIngredientRepository';

const repo = new PostgresGlobalIngredientRepository();

export class GlobalIngredientController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const items = await repo.findAll();
      res.json({ success: true, data: items });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar ingredientes globais' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, price, unit, packageAmount, category } = req.body;
      if (!name || price == null || !unit) {
        res.status(400).json({ success: false, error: 'name, price e unit são obrigatórios' });
        return;
      }
      const item = await repo.create({ name, price, unit, packageAmount: packageAmount ?? 1000, category: category ?? '' });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar ingrediente global' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await repo.update(id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Ingrediente não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar ingrediente global' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Ingrediente não encontrado' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir ingrediente global' });
    }
  }
}
