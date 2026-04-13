import { Request, Response } from 'express';
import { PostgresSeasonRepository } from '../../infrastructure/repositories/PostgresSeasonRepository';

const repo = new PostgresSeasonRepository();

export class SeasonController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const seasons = await repo.findAll(userId);
      res.json({ success: true, data: seasons });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao buscar temporadas' });
    }
  }

  async getActive(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const season = await repo.findActive(userId);
      res.json({ success: true, data: season });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao buscar temporada ativa' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { name, startDate, endDate, multiplier } = req.body;
      if (!name || !startDate || !endDate || typeof multiplier !== 'number') {
        res.status(400).json({ success: false, message: 'Dados inválidos' });
        return;
      }
      const season = await repo.create(userId, { name, startDate, endDate, multiplier });
      res.status(201).json({ success: true, data: season });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao criar temporada' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { id } = req.params;
      const { name, startDate, endDate, multiplier } = req.body;
      const season = await repo.update(id, userId, { name, startDate, endDate, multiplier });
      if (!season) {
        res.status(404).json({ success: false, message: 'Temporada não encontrada' });
        return;
      }
      res.json({ success: true, data: season });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao atualizar temporada' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { id } = req.params;
      const deleted = await repo.delete(id, userId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Temporada não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, message: 'Erro ao excluir temporada' });
    }
  }
}
