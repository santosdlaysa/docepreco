import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PostgresSupportRepository, BroadcastTarget } from '../../infrastructure/repositories/PostgresSupportRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { pool } from '../../infrastructure/database/connection';
import { notifySupportMessage } from '../../infrastructure/services/telegramService';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { getActiveOffer } from '../../infrastructure/services/winbackService';

const repo = new PostgresSupportRepository();
const pushTokenRepo = new PostgresPushTokenRepository();

// In-memory typing status: userId -> timestamp when admin started typing
const adminTyping = new Map<string, number>();
const TYPING_TIMEOUT_MS = 5000;

export class SupportController {
  async getDiscountOffer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const offer = await getActiveOffer(req.userId!);
      res.json({ success: true, data: offer ? { discountPercent: offer.discountPercent, expiresAt: offer.expiresAt } : null });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao consultar oferta.' });
    }
  }

  async adminSendDiscountOffer(req: Request, res: Response): Promise<void> {
    const { discountPercent, validDays } = req.body;
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 90
      || !Number.isInteger(validDays) || validDays < 1 || validDays > 60) {
      res.status(400).json({ success: false, error: 'Informe desconto de 1 a 90% e validade de 1 a 60 dias.' });
      return;
    }
    try {
      const { userId } = req.params;
      const client = await pool.connect();
      let item;
      try {
        await client.query('BEGIN');
        const user = await client.query(
          `SELECT id FROM users WHERE id = $1 AND is_premium = FALSE
           AND premium_until <= NOW() FOR UPDATE`, [userId]
        );
        if (!user.rows.length) {
          await client.query('ROLLBACK');
          res.status(400).json({ success: false, error: 'Oferta disponível apenas para ex-assinantes com plano expirado.' });
          return;
        }
        await client.query(
          `UPDATE winback_offers SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`, [userId]
        );
        const offer = await client.query(
          `INSERT INTO winback_offers (user_id, discount_percent, expires_at)
           VALUES ($1, $2, NOW() + $3 * INTERVAL '1 day') RETURNING expires_at`,
          [userId, discountPercent, validDays]
        );
        const expires = new Date(offer.rows[0].expires_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const message = `Oi! 💖 Volte para o DocePreço com ${discountPercent}% de desconto no pagamento via PIX! Oferta válida até ${expires} (horário de Brasília). Toque abaixo para assinar e gerar o PIX com desconto:\n[[assinar]]`;
        item = await repo.create({ userId, senderType: 'admin', message }, client);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      pushTokenRepo.findByUserId(userId).then(tokens => {
        if (tokens.length) return sendPushNotifications(tokens.map(t => t.token), 'Suporte DocePreço',
          `Volte com ${discountPercent}% de desconto no PIX! Confira sua oferta no chat.`, { screen: 'SupportChat' });
      }).catch(() => {});
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('[Support] discount offer error:', error);
      res.status(500).json({ success: false, error: 'Erro ao enviar oferta com desconto.' });
    }
  }

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

  // Envia a mesma mensagem para o chat de TODOS os usuários do público escolhido
  // (default: all). Grava no chat de cada um e dispara push avisando (best-effort).
  async adminBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const { message, imageUrl } = req.body;
      const target: BroadcastTarget = ['all', 'premium', 'free', 'master', 'expired'].includes(req.body?.target)
        ? req.body.target
        : 'all';
      const trimmed = (message ?? '').trim();
      if (!trimmed && !imageUrl) {
        res.status(400).json({ success: false, error: 'message ou imageUrl é obrigatório' });
        return;
      }

      const recipients = await repo.createBroadcast({ message: trimmed, imageUrl: imageUrl ?? null, target });

      // Push para o mesmo público (fire-and-forget) — assim as pessoas percebem a
      // mensagem sem precisar abrir o suporte por acaso.
      pushTokenRepo.findByTarget(target)
        .then(tokens => {
          if (tokens.length > 0) {
            const tokenStrings = tokens.map(t => t.token);
            const preview = trimmed || '📷 Imagem';
            sendPushNotifications(tokenStrings, 'Suporte DocePreço', preview, { screen: 'SupportChat' });
          }
        })
        .catch(() => {});

      res.status(201).json({ success: true, data: { recipients, target } });
    } catch (error: any) {
      console.error('[Support] adminBroadcast error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao enviar mensagem em massa' });
    }
  }

  // Diz se a pessoa tem algum token de push registrado (app instalado + notificações
  // permitidas). Serve de diagnóstico: se não houver token, a mensagem do admin não vira
  // notificação no celular dela.
  async adminGetPushStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const tokens = await pushTokenRepo.findByUserId(userId);
      res.json({ success: true, data: { hasToken: tokens.length > 0, tokenCount: tokens.length } });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao verificar notificações' });
    }
  }

  async adminDeleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const deleted = await repo.deleteAdminMessage(messageId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Mensagem não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao apagar mensagem' });
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
