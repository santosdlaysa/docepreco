import { Request, Response } from 'express';
import { PostgresOnboardingRepository } from '../../infrastructure/repositories/PostgresOnboardingRepository';

const repo = new PostgresOnboardingRepository();

export class OnboardingController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar onboarding' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar onboarding ativo' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, imageUrl, sortOrder, isActive } = req.body;
      if (!title) { res.status(400).json({ success: false, error: 'title é obrigatório' }); return; }
      const item = await repo.create({ title, description: description ?? '', imageUrl, sortOrder: sortOrder ?? 0, isActive: isActive ?? true });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar etapa de onboarding' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Etapa não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar etapa de onboarding' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Etapa não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir etapa de onboarding' });
    }
  }
}
