import { Request, Response } from 'express';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import {
  endpointPrefix,
  getVapidPublicKey,
  isValidSubscription,
  serializeSubscription,
  webPushEnabled,
} from '../../infrastructure/services/webPushService';

const repo = new PostgresPushTokenRepository();

/** Assinaturas Web Push do navegador (notificações do Doce Preço na web). */
export class WebPushController {
  /** GET /api/web-push/public-key — público. null quando o servidor não tem VAPID. */
  publicKey(_req: Request, res: Response): void {
    res.json({ success: true, data: { publicKey: webPushEnabled() ? getVapidPublicKey() : null } });
  }

  /** POST /api/web-push/subscription — { subscription } (PushSubscription.toJSON()). */
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { userId?: string }).userId!;
      const sub = req.body?.subscription;
      if (!webPushEnabled()) {
        res.status(503).json({ success: false, error: 'Notificações na web ainda não estão disponíveis.' });
        return;
      }
      if (!isValidSubscription(sub)) {
        res.status(400).json({ success: false, error: 'Assinatura inválida.' });
        return;
      }
      await repo.upsertWeb(userId, serializeSubscription(sub), endpointPrefix(sub.endpoint));
      res.json({ success: true, data: { subscribed: true } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao ativar notificações' });
    }
  }

  /** DELETE /api/web-push/subscription — { endpoint }. */
  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as Request & { userId?: string }).userId!;
      const endpoint = req.body?.endpoint;
      if (typeof endpoint !== 'string' || !endpoint) {
        res.status(400).json({ success: false, error: 'endpoint é obrigatório' });
        return;
      }
      await repo.removeWebByEndpoint(userId, endpointPrefix(endpoint));
      res.json({ success: true, data: { subscribed: false } });
    } catch (error) {
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Erro ao desativar notificações' });
    }
  }
}
