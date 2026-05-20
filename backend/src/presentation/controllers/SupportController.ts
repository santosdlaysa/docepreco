import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresSupportRepository } from '../../infrastructure/repositories/PostgresSupportRepository';

const repo = new PostgresSupportRepository();

export class SupportController {
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      await repo.markAsRead(userId, 'admin');
      const messages = await repo.findByUserId(userId);
      res.json({ success: true, data: messages });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar mensagens' });
    }
  }

  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      if (!message?.trim()) {
        res.status(400).json({ success: false, error: 'message é obrigatório' });
        return;
      }
      const item = await repo.create({ userId: req.userId!, senderType: 'user', message: message.trim() });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const count = await repo.getUnreadCountForUser(req.userId!);
      res.json({ success: true, data: { unreadCount: count } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar contagem' });
    }
  }

  async adminGetConversations(_req: Request, res: Response): Promise<void> {
    try {
      const conversations = await repo.getConversations();
      res.json({ success: true, data: conversations });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar conversas' });
    }
  }

  async adminGetMessages(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await repo.markAsRead(userId, 'user');
      const messages = await repo.findByUserId(userId);
      res.json({ success: true, data: messages });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar mensagens' });
    }
  }

  async adminSendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      if (!message?.trim()) {
        res.status(400).json({ success: false, error: 'message é obrigatório' });
        return;
      }
      const item = await repo.create({ userId, senderType: 'admin', message: message.trim() });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
    }
  }

  async adminGetUnreadCount(_req: Request, res: Response): Promise<void> {
    try {
      const count = await repo.getTotalUnreadCount();
      res.json({ success: true, data: { unreadCount: count } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar contagem' });
    }
  }
}
