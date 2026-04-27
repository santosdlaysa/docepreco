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
