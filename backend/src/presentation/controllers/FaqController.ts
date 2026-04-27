import { Request, Response } from 'express';
import { PostgresFaqRepository } from '../../infrastructure/repositories/PostgresFaqRepository';

const repo = new PostgresFaqRepository();

export class FaqController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar FAQs' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar FAQs ativas' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { question, answer, category, sortOrder, isActive } = req.body;
      if (!question || !answer) { res.status(400).json({ success: false, error: 'question e answer são obrigatórios' }); return; }
      const item = await repo.create({ question, answer, category: category ?? '', sortOrder: sortOrder ?? 0, isActive: isActive ?? true });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar FAQ' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'FAQ não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar FAQ' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'FAQ não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir FAQ' });
    }
  }
}
