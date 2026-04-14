import { Request, Response } from 'express';
import { PostgresTipRepository } from '../../infrastructure/repositories/PostgresTipRepository';

const repo = new PostgresTipRepository();

export class TipController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const tips = await repo.findAll();
      res.json({ success: true, data: tips });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao buscar dicas' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const tips = await repo.findActive();
      res.json({ success: true, data: tips });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao buscar dicas ativas' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ success: false, error: 'message é obrigatório' });
        return;
      }
      const tip = await repo.create(message.trim());
      res.status(201).json({ success: true, data: tip });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar dica' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message, isActive } = req.body;
      const tip = await repo.update(id, { message, isActive });
      if (!tip) {
        res.status(404).json({ success: false, error: 'Dica não encontrada' });
        return;
      }
      res.json({ success: true, data: tip });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar dica' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await repo.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Dica não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao excluir dica' });
    }
  }
}
