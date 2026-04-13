import { Request, Response } from 'express';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PremiumPlatform } from '../../domain/entities/User';

const userRepo = new PostgresUserRepository();

/**
 * RevenueCat webhook event types we care about.
 * https://www.revenuecat.com/docs/integrations/webhooks/event-flows
 */
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'TRANSFER';

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
}

interface RevenueCatWebhookBody {
  api_version?: string;
  event: RevenueCatEvent;
}

const storeToPlatform = (store?: RevenueCatEvent['store']): PremiumPlatform | null => {
  if (store === 'APP_STORE') return 'ios';
  if (store === 'PLAY_STORE') return 'android';
  return 'manual';
};

export class PremiumController {
  /**
   * Webhook from RevenueCat. Expects `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
   */
  async revenueCatWebhook(req: Request, res: Response): Promise<void> {
    const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expected) {
      console.error('[Premium] REVENUECAT_WEBHOOK_SECRET not configured');
      res.status(500).json({ success: false, error: 'Webhook secret not configured' });
      return;
    }

    const auth = req.headers.authorization;
    if (auth !== `Bearer ${expected}`) {
      console.warn('[Premium] Unauthorized webhook attempt');
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body as RevenueCatWebhookBody;
    const event = body?.event;
    if (!event || !event.type || !event.app_user_id) {
      res.status(400).json({ success: false, error: 'Invalid payload' });
      return;
    }

    console.log(`[Premium] Webhook ${event.type} for ${event.app_user_id}`);

    try {
      const userId = event.app_user_id;
      const user = await userRepo.findById(userId);
      if (!user) {
        console.warn(`[Premium] User ${userId} not found — ignoring`);
        // Return 200 so RevenueCat doesn't keep retrying
        res.json({ success: true, message: 'User not found, ignored' });
        return;
      }

      const platform = storeToPlatform(event.store);
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

      switch (event.type) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
        case 'PRODUCT_CHANGE':
        case 'NON_RENEWING_PURCHASE':
          await userRepo.updatePremiumStatus(userId, true, expiresAt, platform);
          break;

        case 'EXPIRATION':
        case 'BILLING_ISSUE':
          await userRepo.updatePremiumStatus(userId, false, expiresAt, platform);
          break;

        case 'CANCELLATION':
          // User cancelled but subscription still active until expiration
          // Keep premium true, but the client-side can show "cancelled, ends on X"
          break;

        default:
          console.log(`[Premium] Unhandled event type: ${event.type}`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Premium] Webhook processing error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Admin-only endpoint to manually toggle premium status.
   * Protected by X-Admin-Secret header. Useful for testing, cortesias, support.
   *
   * Body: { isPremium: boolean, premiumUntil?: string | null }
   */
  async setPremiumManually(req: Request, res: Response): Promise<void> {
    const expected = process.env.DOCEPRECO_ADMIN_SECRET;
    if (!expected) {
      res.status(500).json({ success: false, error: 'Admin secret not configured' });
      return;
    }

    const provided = req.headers['x-admin-secret'];
    if (provided !== expected) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { isPremium, premiumUntil } = req.body as {
      isPremium: boolean;
      premiumUntil?: string | null;
    };

    if (typeof isPremium !== 'boolean') {
      res.status(400).json({ success: false, error: 'isPremium boolean required' });
      return;
    }

    try {
      const until = premiumUntil ? new Date(premiumUntil) : null;
      const user = await userRepo.updatePremiumStatus(id, isPremium, until, 'manual');
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('[Premium] Manual update error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
