import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresSupportRepository } from '../../infrastructure/repositories/PostgresSupportRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { pool } from '../../infrastructure/database/connection';
import { notifySupportMessage } from '../../infrastructure/services/telegramService';
import { sendPushNotifications } from '../../infrastructure/services/pushService';

const repo = new PostgresSupportRepository();
const pushTokenRepo = new PostgresPushTokenRepository();

// In-memory typing status: userId -> timestamp when admin started typing
const adminTyping = new Map<string, number>();
const TYPING_TIMEOUT_MS = 5000;

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
      const { message, imageUrl } = req.body;
      const trimmed = (message ?? '').trim();
      if (!trimmed && !imageUrl) {
        res.status(400).json({ success: false, error: 'message ou imageUrl é obrigatório' });
        return;
      }
      const item = await repo.create({ userId: req.userId!, senderType: 'user', message: trimmed, imageUrl: imageUrl ?? null });

      // Telegram notification (fire-and-forget)
      pool.query('SELECT company_name, email FROM users WHERE id = $1', [req.userId!])
        .then(({ rows }) => {
          if (rows.length > 0) {
            const preview = trimmed || '[imagem]';
            notifySupportMessage(rows[0].company_name ?? 'Sem nome', rows[0].email, preview);
          }
        })
        .catch(() => {});

      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      console.error('[Support] sendMessage error:', error);
      if (error?.code === '23503') {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
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
      const { message, imageUrl } = req.body;
      const trimmed = (message ?? '').trim();
      if (!trimmed && !imageUrl) {
        res.status(400).json({ success: false, error: 'message ou imageUrl é obrigatório' });
        return;
      }
      const item = await repo.create({ userId, senderType: 'admin', message: trimmed, imageUrl: imageUrl ?? null });

      // Push notification para o usuário (fire-and-forget)
      pushTokenRepo.findByUserId(userId)
        .then(tokens => {
          if (tokens.length > 0) {
            const tokenStrings = tokens.map(t => t.token);
            const preview = trimmed || '📷 Imagem';
            sendPushNotifications(tokenStrings, 'Suporte DocePreço', preview, { screen: 'SupportChat' });
          }
        })
        .catch(() => {});

      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      console.error('[Support] adminSendMessage error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      if (error?.code === '23503') {
        res.status(404).json({ success: false, error: 'Usuário não encontrado' });
        return;
      }
      const detail = process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      res.status(500).json({ success: false, error: detail });
    }
  }

  async adminSetTyping(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    adminTyping.set(userId, Date.now());
    res.json({ success: true });
  }

  async getAdminTyping(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId!;
    const lastTyping = adminTyping.get(userId);
    const isTyping = !!lastTyping && (Date.now() - lastTyping) < TYPING_TIMEOUT_MS;
    if (!isTyping) adminTyping.delete(userId);
    res.json({ success: true, data: { typing: isTyping } });
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
