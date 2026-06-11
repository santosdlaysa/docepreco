import { Request, Response } from 'express';
import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PremiumPlatform } from '../../domain/entities/User';
import { notifyPremiumEvent } from '../../infrastructure/services/telegramService';
import { AuthRequest } from '../middleware/authMiddleware';
import { pool } from '../../infrastructure/database/connection';
import { safeEqual } from '../../config/secrets';
import { fetchRevenueCatEntitlement, isRevenueCatVerificationEnabled } from '../../infrastructure/services/revenueCatService';

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
  aliases?: string[];
  product_id?: string;
  store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  // Preço da transação enviado pelo RevenueCat. `price_in_purchased_currency` é o
  // valor que o cliente realmente pagou na moeda da loja; `price` é o equivalente.
  price?: number;
  price_in_purchased_currency?: number;
  currency?: string;
}

/** Converte o preço do webhook do RevenueCat em centavos, ou null se ausente. */
const eventAmountCents = (event: RevenueCatEvent): number | null => {
  const value = event.price_in_purchased_currency ?? event.price;
  if (typeof value !== 'number' || value <= 0) return null;
  return Math.round(value * 100);
};

interface RevenueCatWebhookBody {
  api_version?: string;
  event: RevenueCatEvent;
}

const storeToPlatform = (store?: RevenueCatEvent['store']): PremiumPlatform | null => {
  if (store === 'APP_STORE') return 'ios';
  if (store === 'PLAY_STORE') return 'android';
  return 'manual';
};

/**
 * Maps a RevenueCat product_id to a paid tier. The Master products are named
 * `premium_master` / `premium_master_anual` — they contain BOTH "premium" and
 * "master", so we MUST test "master" first, otherwise they'd be misclassified
 * as Premium.
 */
const productToTier = (productId?: string): 'premium' | 'master' =>
  productId?.toLowerCase().includes('master') ? 'master' : 'premium';

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
    if (!safeEqual(auth, `Bearer ${expected}`)) {
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

    console.log(
      `[Premium] Webhook ${event.type} for ${event.app_user_id}` +
      ` | expiration_at_ms=${event.expiration_at_ms ?? 'null'}` +
      ` | store=${event.store ?? 'null'}` +
      ` | product=${event.product_id ?? 'null'}`
    );

    try {
      // RevenueCat may send an anonymous ID ($RCAnonymousID:...) as app_user_id
      // when the purchase happened before identifyRevenueCatUser() was called.
      // Strategy: try direct lookup, then aliases table, then original_app_user_id.
      let userId = event.app_user_id;
      let user = await userRepo.findById(userId);

      // Try original_app_user_id
      if (!user && event.original_app_user_id && event.original_app_user_id !== userId) {
        console.log(`[Premium] Trying original_app_user_id: ${event.original_app_user_id}`);
        user = await userRepo.findById(event.original_app_user_id);
        if (user) userId = event.original_app_user_id;
      }

      // Try aliases from event payload
      if (!user && event.aliases?.length) {
        for (const alias of event.aliases) {
          if (alias === userId || alias === event.original_app_user_id) continue;
          user = await userRepo.findById(alias);
          if (user) { userId = alias; break; }
        }
      }

      // Try our revenuecat_aliases table (maps RC anonymous IDs to our user UUIDs)
      if (!user) {
        const rcIds = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].filter(Boolean) as string[];
        const aliasResult = await pool.query(
          `SELECT user_id FROM revenuecat_aliases WHERE rc_id = ANY($1) LIMIT 1`,
          [rcIds]
        );
        if (aliasResult.rows.length > 0) {
          userId = aliasResult.rows[0].user_id;
          user = await userRepo.findById(userId);
          if (user) console.log(`[Premium] Resolved via revenuecat_aliases: ${event.app_user_id} → ${userId}`);
        }
      }

      if (!user) {
        console.warn(`[Premium] User ${userId} not found — ignoring`);
        // Return 200 so RevenueCat doesn't keep retrying
        res.json({ success: true, message: 'User not found, ignored' });
        return;
      }

      // Save all known RC IDs as aliases for future lookups
      const allRcIds = new Set([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].filter(Boolean) as string[]);
      for (const rcId of allRcIds) {
        await pool.query(
          `INSERT INTO revenuecat_aliases (rc_id, user_id) VALUES ($1, $2) ON CONFLICT (rc_id) DO UPDATE SET user_id = $2`,
          [rcId, userId]
        );
      }

      const platform = storeToPlatform(event.store);
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

      switch (event.type) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
        case 'PRODUCT_CHANGE':
        case 'NON_RENEWING_PURCHASE':
          await userRepo.updatePlanTier(userId, productToTier(event.product_id), expiresAt, platform);
          break;

        case 'EXPIRATION':
        case 'BILLING_ISSUE':
          await userRepo.updatePlanTier(userId, 'free', expiresAt, platform);
          break;

        case 'CANCELLATION':
          // User cancelled but subscription still active until expiration
          // Keep the tier active; the client-side can show "cancelled, ends on X"
          break;

        case 'TRANSFER':
          // User alias merged — grant the purchased tier to the new user
          await userRepo.updatePlanTier(userId, productToTier(event.product_id), expiresAt, platform);
          break;

        default:
          console.log(`[Premium] Unhandled event type: ${event.type}`);
      }

      // Record premium event for history tracking (com o valor pago, quando o RC envia)
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store, amount_cents, currency)
         VALUES ($1, $2, 'webhook', $3, $4, $5, $6, $7, COALESCE($8, 'BRL'))`,
        [userId, event.type, platform, event.product_id ?? null, expiresAt, event.store ?? null, eventAmountCents(event), event.currency ?? null]
      );

      notifyPremiumEvent(user.companyName, event.type, platform);
      res.json({ success: true });
    } catch (error) {
      console.error('[Premium] Webhook processing error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Authenticated endpoint called by the mobile app after a successful purchase
   * or restore. The client sends entitlement data from RevenueCat SDK (already
   * validated by Apple/Google), and we update the DB so the user gets premium
   * even if the webhook failed or was processed with an anonymous ID.
   *
   * Body: { active: boolean, expiresAt?: string | null, platform?: 'ios' | 'android' }
   */
  async syncPremium(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { active, expiresAt, platform } = req.body as {
      active: boolean;
      expiresAt?: string | null;
      platform?: 'ios' | 'android';
    };

    if (typeof active !== 'boolean') {
      res.status(400).json({ success: false, error: 'active boolean required' });
      return;
    }

    try {
      const user = await userRepo.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Only allow upgrading to premium via sync (not downgrading)
      // Downgrades are handled exclusively by webhooks (EXPIRATION, BILLING_ISSUE)
      if (!active) {
        res.json({ success: true, data: user });
        return;
      }

      // SEGURANÇA: não confiar no `active`/`expiresAt` enviados pelo cliente — qualquer
      // um poderia forjar o body e ganhar premium grátis. Quando REVENUECAT_SECRET_KEY
      // está configurada, validamos a assinatura direto no RevenueCat (fonte de verdade)
      // e usamos a data de expiração dele, ignorando o que o cliente mandou.
      if (isRevenueCatVerificationEnabled()) {
        let ent;
        try {
          ent = await fetchRevenueCatEntitlement(userId);
        } catch (err) {
          console.error('[Premium] Falha ao verificar no RevenueCat:', err);
          res.status(502).json({ success: false, error: 'Não foi possível verificar a assinatura' });
          return;
        }

        if (!ent || !ent.active) {
          // RevenueCat não confirma assinatura ativa → NÃO concede premium
          console.warn(`[Premium] Sync negado: RevenueCat não confirma assinatura ativa para ${userId}`);
          res.json({ success: true, data: user });
          return;
        }

        const plat: PremiumPlatform = ent.platform ?? (platform === 'android' ? 'android' : 'ios');
        const updated = await userRepo.updatePlanTier(userId, ent.tier, ent.expiresAt, plat);
        console.log(`[Premium] Sync verificado (RC): ${userId} → ${ent.tier} via ${plat} | expiresAt=${ent.expiresAt?.toISOString() ?? 'null'}`);

        await pool.query(
          `INSERT INTO premium_events (user_id, event_type, source, platform, expiration_at)
           VALUES ($1, $2, 'app_sync', $3, $4)`,
          [userId, user.isPremium ? 'SYNC' : 'INITIAL_PURCHASE', plat, ent.expiresAt]
        );

        if (!user.isPremium) {
          notifyPremiumEvent(user.companyName, 'INITIAL_PURCHASE', plat);
        }

        res.json({ success: true, data: updated });
        return;
      }

      // Fallback legado (REVENUECAT_SECRET_KEY ausente): confia no cliente — INSEGURO.
      // Configure REVENUECAT_SECRET_KEY para fechar essa brecha (premium grátis forjável).
      console.warn('[Premium] syncPremium SEM REVENUECAT_SECRET_KEY — confiando no cliente (INSEGURO). Configure a chave para validar no servidor.');
      const until = expiresAt ? new Date(expiresAt) : null;
      const plat: PremiumPlatform = platform === 'android' ? 'android' : 'ios';
      const updated = await userRepo.updatePremiumStatus(userId, true, until, plat);

      console.log(`[Premium] Sync: ${userId} → premium=true via ${plat} | expiresAt=${expiresAt ?? 'null'} | prevUntil=${user.premiumUntil ?? 'null'}`);

      // Record sync event
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, expiration_at)
         VALUES ($1, $2, 'app_sync', $3, $4)`,
        [userId, user.isPremium ? 'SYNC' : 'INITIAL_PURCHASE', plat, until]
      );

      if (!user.isPremium) {
        notifyPremiumEvent(user.companyName, 'INITIAL_PURCHASE', plat);
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('[Premium] Sync error:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Authenticated endpoint to activate/request trial for free users who never paid.
   * Verifies user is free and has no real payment history (PIX, App Store, Stripe).
   * Returns the trial tier and duration from plan config.
   */
  async requestTrial(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const user = await userRepo.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Only free users can request trial
      if (user.isPremium) {
        res.status(400).json({ success: false, error: 'User already has active premium' });
        return;
      }

      // Check if user ever made a real payment (PIX, App Store, Stripe)
      const paymentCheck = await pool.query(
        `SELECT COUNT(*) as count FROM premium_events
         WHERE user_id = $1 AND source IN ('webhook', 'pix', 'stripe')`,
        [userId]
      );
      const hasPaidBefore = parseInt(paymentCheck.rows[0].count) > 0;
      if (hasPaidBefore) {
        res.status(400).json({ success: false, error: 'User has payment history' });
        return;
      }

      // Get trial configuration
      const settings = await pool.query(
        `SELECT key, value FROM app_settings WHERE key IN ($1, $2, $3)`,
        ['plan_new_user_trial_tier', 'plan_premium_free_days', 'plan_master_free_days']
      );
      const settingsMap: Record<string, string> = {};
      for (const row of settings.rows) settingsMap[row.key] = row.value;

      const trialTier = settingsMap['plan_new_user_trial_tier'] || 'master';
      const masterDays = parseInt(settingsMap['plan_master_free_days'] || '3');
      const premiumDays = parseInt(settingsMap['plan_premium_free_days'] || '2');

      if (trialTier === 'free') {
        res.status(400).json({ success: false, error: 'Trial is not enabled' });
        return;
      }

      const trialDays = trialTier === 'master' ? masterDays : premiumDays;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      const updatedUser = await userRepo.updatePlanTier(userId, trialTier as 'premium' | 'master', trialEnd, null);

      // Record trial event
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, expiration_at)
         VALUES ($1, $2, 'trial', $3)`,
        [userId, 'TRIAL_ACTIVATED', trialEnd]
      );

      res.json({ success: true, data: { user: updatedUser, trialDays, trialTier } });
    } catch (error) {
      console.error('[Premium] Request trial error:', error);
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
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
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
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
      res.locals.errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
}
