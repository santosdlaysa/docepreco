import { Request, Response } from 'express';
import { PostgresBannerRepository } from '../../infrastructure/repositories/PostgresBannerRepository';

const repo = new PostgresBannerRepository();

export class BannerController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const banners = await repo.findAll();
      res.json({ success: true, data: banners });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar banners' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const banners = await repo.findActive();
      res.json({ success: true, data: banners });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar banners ativos' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, type, actionUrl, startsAt, endsAt } = req.body;
      if (!title || !message || !type) {
        res.status(400).json({ success: false, error: 'title, message e type são obrigatórios' });
        return;
      }
      if (!['info', 'warning', 'promo', 'update'].includes(type)) {
        res.status(400).json({ success: false, error: 'type inválido' });
        return;
      }
      const banner = await repo.create({ title, message, type, actionUrl, startsAt, endsAt });
      res.status(201).json({ success: true, data: banner });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao criar banner' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, message, type, actionUrl, startsAt, endsAt, isActive } = req.body;
      const banner = await repo.update(id, { title, message, type, actionUrl, startsAt, endsAt, isActive });
      if (!banner) {
        res.status(404).json({ success: false, error: 'Banner não encontrado' });
        return;
      }
      res.json({ success: true, data: banner });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao atualizar banner' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await repo.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Banner não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir banner' });
    }
  }
}
