import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresClientRepository } from '../../infrastructure/repositories/PostgresClientRepository';

const repo = new PostgresClientRepository();

export class ClientController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await repo.findAll(req.userId!);
      res.json({ success: true, data });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, phone, email, birthday, address, notes } = req.body;
      if (!name || !String(name).trim()) {
        res.status(400).json({ success: false, error: 'name é obrigatório' });
        return;
      }
      const client = await repo.create(
        { name: String(name).trim(), phone, email, birthday, address, notes },
        req.userId!
      );
      res.status(201).json({ success: true, data: client });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const client = await repo.update(req.params.id, req.userId!, req.body);
      if (!client) {
        res.status(404).json({ success: false, error: 'Cliente não encontrado' });
        return;
      }
      res.json({ success: true, data: client });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await repo.delete(req.params.id, req.userId!);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Cliente não encontrado' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
