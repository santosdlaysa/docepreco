import { Request, Response } from 'express';
import { PostgresFeaturedRecipeRepository } from '../../infrastructure/repositories/PostgresFeaturedRecipeRepository';

const repo = new PostgresFeaturedRecipeRepository();

export class FeaturedRecipeController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar receitas destaque' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar receitas destaque ativas' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, imageUrl, category, isActive, sortOrder } = req.body;
      if (!name) { res.status(400).json({ success: false, error: 'name é obrigatório' }); return; }
      const item = await repo.create({ name, description: description ?? '', imageUrl, category: category ?? '', isActive: isActive ?? true, sortOrder: sortOrder ?? 0 });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar receita destaque' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Receita não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar receita destaque' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Receita não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir receita destaque' });
    }
  }
}
