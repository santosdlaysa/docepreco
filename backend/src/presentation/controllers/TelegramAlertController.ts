import { Request, Response } from 'express';
import { PostgresTelegramAlertRepository } from '../../infrastructure/repositories/PostgresTelegramAlertRepository';

const repo = new PostgresTelegramAlertRepository();

export class TelegramAlertController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar alertas do Telegram' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { key, label, description, isEnabled, category } = req.body;
      if (!key || !label) { res.status(400).json({ success: false, error: 'key e label são obrigatórios' }); return; }
      const item = await repo.create({ key, label, description: description ?? '', isEnabled: isEnabled ?? true, category: category ?? 'alerts' });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar alerta' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) { res.status(404).json({ success: false, error: 'Alerta não encontrado' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir alerta' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const item = await repo.update(req.params.id, req.body);
      if (!item) { res.status(404).json({ success: false, error: 'Alerta não encontrado' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar alerta' });
    }
  }
}
