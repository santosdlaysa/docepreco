import { Request, Response } from 'express';
import { PostgresNotificationRepository } from '../../infrastructure/repositories/PostgresNotificationRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { sendPushNotificationsDetailed } from '../../infrastructure/services/pushService';
import type { PushToken } from '../../infrastructure/repositories/PostgresPushTokenRepository';

const notifRepo = new PostgresNotificationRepository();
const tokenRepo = new PostgresPushTokenRepository();

// "Enviados" = nº de assinantes (usuários distintos) que receberam, não de
// dispositivos. Um usuário tem vários tokens (celular + reinstalações), então
// contar tokens inflava o número. Mapeia os tokens aceitos pelo Expo de volta
// para seus donos e conta usuários únicos.
function countReachedUsers(tokens: PushToken[], successfulTokens: string[]): number {
  const delivered = new Set(successfulTokens);
  const users = new Set<string>();
  for (const t of tokens) {
    if (delivered.has(t.token)) users.add(t.userId);
  }
  return users.size;
}

export class NotificationController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const notifications = await notifRepo.findAll();
      res.json({ success: true, data: notifications });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao buscar notificações' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, dataJson, target, scheduledAt } = req.body;
      if (!title || !body) {
        res.status(400).json({ success: false, error: 'title e body são obrigatórios' });
        return;
      }

      const notification = await notifRepo.create({
        title,
        body,
        dataJson,
        target,
        scheduledAt,
      });

      // If no scheduledAt, send immediately
      if (!scheduledAt) {
        try {
          const tokens = await tokenRepo.findByTarget(notification.target);
          const tokenStrings = tokens.map(t => t.token);
          const data = dataJson ? JSON.parse(dataJson) : undefined;
          const { successfulTokens } = await sendPushNotificationsDetailed(tokenStrings, title, body, data);
          const count = countReachedUsers(tokens, successfulTokens);
          await notifRepo.markSent(notification.id, count);
          const updated = await notifRepo.findById(notification.id);
          res.status(201).json({ success: true, data: updated });
          return;
        } catch (err) {
          await notifRepo.markFailed(notification.id);
          const updated = await notifRepo.findById(notification.id);
          res.status(201).json({ success: true, data: updated, warning: 'Criada mas falhou ao enviar' });
          return;
        }
      }

      res.status(201).json({ success: true, data: notification });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao criar notificação' });
    }
  }

  async send(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notifRepo.findById(id);
      if (!notification) {
        res.status(404).json({ success: false, error: 'Notificação não encontrada' });
        return;
      }
      if (notification.status === 'sent') {
        res.status(400).json({ success: false, error: 'Notificação já foi enviada' });
        return;
      }

      const tokens = await tokenRepo.findByTarget(notification.target);
      const tokenStrings = tokens.map(t => t.token);
      const data = notification.dataJson ? JSON.parse(notification.dataJson) : undefined;
      const { successfulTokens } = await sendPushNotificationsDetailed(tokenStrings, notification.title, notification.body, data);
      const count = countReachedUsers(tokens, successfulTokens);
      await notifRepo.markSent(id, count);

      const updated = await notifRepo.findById(id);
      res.json({ success: true, data: updated });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao enviar notificação' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await notifRepo.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Notificação não encontrada' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: 'Erro ao excluir notificação' });
    }
  }
}
