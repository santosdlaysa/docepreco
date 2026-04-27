import { Request, Response } from 'express';
import { PostgresFeatureFlagRepository } from '../../infrastructure/repositories/PostgresFeatureFlagRepository';

const repo = new PostgresFeatureFlagRepository();

export class FeatureFlagController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar feature flags' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findActive() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar feature flags ativas' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { key, description, isEnabled } = req.body;
      if (!key) { res.status(400).json({ success: false, error: 'key é obrigatório' }); return; }
      const item = await repo.create({ key, description: description ?? '', isEnabled: isEnabled ?? false });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar feature flag' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Flag não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar feature flag' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Flag não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir feature flag' });
    }
  }
}
