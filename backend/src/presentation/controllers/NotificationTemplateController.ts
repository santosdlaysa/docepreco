import { Request, Response } from 'express';
import { PostgresNotificationTemplateRepository } from '../../infrastructure/repositories/PostgresNotificationTemplateRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { PostgresNotificationRepository } from '../../infrastructure/repositories/PostgresNotificationRepository';
import { sendPushNotifications } from '../../infrastructure/services/pushService';

const repo = new PostgresNotificationTemplateRepository();
const tokenRepo = new PostgresPushTokenRepository();
const notifRepo = new PostgresNotificationRepository();

export class NotificationTemplateController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const templates = await repo.findAll();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao buscar templates' });
    }
  }

  async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const templates = await repo.findActive();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao buscar templates ativos' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, body, isActive } = req.body;

      const updated = await repo.update(id, { title, body, isActive });
      if (!updated) {
        res.status(404).json({ success: false, error: 'Template não encontrado' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar template' });
    }
  }

  async send(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { target = 'all' } = req.body;

      const templates = await repo.findAll();
      const template = templates.find(t => t.id === id);
      if (!template) {
        res.status(404).json({ success: false, error: 'Template não encontrado' });
        return;
      }

      // Cria registro na tabela notifications para histórico
      const notification = await notifRepo.create({
        title: template.title,
        body: template.body,
        target,
      });

      const tokens = await tokenRepo.findByTarget(target);
      const tokenStrings = tokens.map(t => t.token);

      try {
        const count = await sendPushNotifications(tokenStrings, template.title, template.body);
        await notifRepo.markSent(notification.id, count);
        const updated = await notifRepo.findById(notification.id);
        res.json({ success: true, data: updated });
      } catch (err) {
        await notifRepo.markFailed(notification.id);
        const updated = await notifRepo.findById(notification.id);
        res.locals.errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ success: false, data: updated, error: 'Falha ao enviar push' });
      }
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao enviar notificação' });
    }
  }
}
