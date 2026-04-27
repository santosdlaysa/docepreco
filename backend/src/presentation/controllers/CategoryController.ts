import { Request, Response } from 'express';
import { PostgresCategoryRepository } from '../../infrastructure/repositories/PostgresCategoryRepository';

const repo = new PostgresCategoryRepository();

export class CategoryController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar categorias' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar categorias ativas' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, icon, sortOrder, isActive } = req.body;
      if (!name) { res.status(400).json({ success: false, error: 'name é obrigatório' }); return; }
      const item = await repo.create({ name, icon: icon ?? '', sortOrder: sortOrder ?? 0, isActive: isActive ?? true });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar categoria' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Categoria não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar categoria' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Categoria não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir categoria' });
    }
  }
}
