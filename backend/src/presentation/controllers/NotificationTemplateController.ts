import { Request, Response } from 'express';
import { PostgresNotificationTemplateRepository } from '../../infrastructure/repositories/PostgresNotificationTemplateRepository';

const repo = new PostgresNotificationTemplateRepository();

export class NotificationTemplateController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const templates = await repo.findAll();
      res.json({ success: true, data: templates });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar templates' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const templates = await repo.findActive();
      res.json({ success: true, data: templates });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar templates ativos' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, body, isActive } = req.body;

      const updated = await repo.update(id, { title, body, isActive });
      if (!updated) {
        res.status(404).json({ success: false, error: 'Template não encontrado' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar template' });
    }
  }
}
