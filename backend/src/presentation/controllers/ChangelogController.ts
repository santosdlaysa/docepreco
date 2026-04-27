import { Request, Response } from 'express';
import { PostgresChangelogRepository } from '../../infrastructure/repositories/PostgresChangelogRepository';

const repo = new PostgresChangelogRepository();

export class ChangelogController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar changelog' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar changelog ativo' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { version, title, description, features, isActive } = req.body;
      if (!version || !title) { res.status(400).json({ success: false, error: 'version e title são obrigatórios' }); return; }
      const item = await repo.create({ version, title, description: description ?? '', features: features ?? [], isActive: isActive ?? true });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar changelog' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Changelog não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar changelog' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Changelog não encontrado' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir changelog' });
    }
  }
}
