import { Request, Response } from 'express';
import { PostgresSuggestionRepository } from '../../infrastructure/repositories/PostgresSuggestionRepository';

const repo = new PostgresSuggestionRepository();

export class SuggestionController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await repo.findAll() });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar sugestões' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userName, userEmail, message } = req.body;
      if (!message) { res.status(400).json({ success: false, error: 'message é obrigatório' }); return; }
      const item = await repo.create({ userId, userName: userName ?? '', userEmail: userEmail ?? '', message });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao criar sugestão' });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!['pending', 'read', 'done'].includes(status)) {
        res.status(400).json({ success: false, error: 'Status inválido' });
        return;
      }
      const item = await repo.updateStatus(req.params.id, status);
      if (!item) { res.status(404).json({ success: false, error: 'Sugestão não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
    }
  }

  async addNote(req: Request, res: Response): Promise<void> {
    try {
      const { adminNote } = req.body;
      if (!adminNote) { res.status(400).json({ success: false, error: 'adminNote é obrigatório' }); return; }
      const item = await repo.addNote(req.params.id, adminNote);
      if (!item) { res.status(404).json({ success: false, error: 'Sugestão não encontrada' }); return; }
      res.json({ success: true, data: item });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao adicionar nota' });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const removed = await repo.remove(req.params.id);
      if (!removed) { res.status(404).json({ success: false, error: 'Sugestão não encontrada' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao remover sugestão' });
    }
  }
}
