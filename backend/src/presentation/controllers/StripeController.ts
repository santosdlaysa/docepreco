import { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');

import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { notifyPremiumEvent } from '../../infrastructure/services/telegramService';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';

const userRepo = new PostgresUserRepository();
const pushTokenRepo = new PostgresPushTokenRepository();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

// Preços em centavos (BRL) por plano/tier
const PRICES: Record<string, Record<string, number>> = {
  premium: { monthly: 1490, annual: 12000 },
  master:  { monthly: 3000, annual: 30000 },
};

const PLAN_DAYS: Record<string, number> = { monthly: 30, annual: 365 };

const PLAN_NAMES: Record<string, Record<string, string>> = {
  premium: { monthly: 'DocePreço Premium Mensal', annual: 'DocePreço Premium Anual' },
  master:  { monthly: 'DocePreço Master Mensal',  annual: 'DocePreço Master Anual' },
};

export class StripeController {
  /**
   * Creates a Stripe Checkout Session and returns the URL.
   * POST /api/stripe/create-checkout
   * Body: { plan: 'monthly' | 'annual', tier: 'premium' | 'master' }
   */
  async createCheckout(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { plan, tier } = req.body as {
      plan?: 'monthly' | 'annual';
      tier?: 'premium' | 'master';
    };

    if (!plan || !tier || !PRICES[tier]?.[plan]) {
      res.status(400).json({ success: false, error: 'Invalid plan or tier' });
      return;
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    try {
      const stripe = getStripe();
      const baseUrl = process.env.APP_BASE_URL ?? 'https://docepreco.onrender.com';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'brl',
              unit_amount: PRICES[tier][plan],
              product_data: {
                name: PLAN_NAMES[tier][plan],
                description: `Acesso ${plan === 'annual' ? 'anual' : 'mensal'} ao DocePreço ${tier === 'master' ? 'Master' : 'Premium'}`,
              },
            },
          },
        ],
        metadata: { userId, plan, tier },
        success_url: `${baseUrl}/api/stripe/success`,
        cancel_url: `${baseUrl}/api/stripe/cancel`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (error: any) {
      console.error('[Stripe] createCheckout error:', error?.message ?? error);
      res.status(500).json({ success: false, error: error?.message ?? 'Failed to create checkout session' });
    }
  }

  /**
   * Stripe webhook — called automatically by Stripe after payment.
   * POST /api/stripe/webhook
   * Requires raw body (configured in server.ts before express.json).
   */
  async webhook(req: Request, res: Response): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Stripe] STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    let event: any;
    try {
      const stripe = getStripe();
      const sig = req.headers['stripe-signature'] as string;
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.warn('[Stripe] Webhook signature verification failed:', err);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    if (event.type !== 'checkout.session.completed') {
      res.json({ received: true });
      return;
    }

    const session = event.data.object;
    const { userId, plan, tier } = (session.metadata ?? {}) as {
      userId?: string;
      plan?: string;
      tier?: string;
    };

    if (!userId || !plan || !tier) {
      console.warn('[Stripe] Webhook missing metadata:', session.metadata);
      res.json({ received: true });
      return;
    }

    try {
      const user = await userRepo.findById(userId);
      if (!user) {
        console.warn(`[Stripe] Webhook: user ${userId} not found`);
        res.json({ received: true });
        return;
      }

      const days = PLAN_DAYS[plan] ?? 30;
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + days);
      const planTier = tier === 'master' ? 'master' : 'premium';

      await userRepo.updatePlanTier(userId, planTier, premiumUntil, 'card');

      // Valor realmente cobrado pela Stripe (em centavos); fallback no preço de tabela.
      const amountCents = typeof session.amount_total === 'number'
        ? session.amount_total
        : (PRICES[planTier]?.[plan] ?? null);
      const currency = (session.currency ?? 'brl').toUpperCase();
      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store, amount_cents, currency)
         VALUES ($1, 'INITIAL_PURCHASE', 'stripe', 'card', $2, $3, 'STRIPE', $4, $5)`,
        [userId, `stripe_${planTier}_${plan}`, premiumUntil, amountCents, currency]
      );

      const tokens = await pushTokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        await sendPushNotifications(
          tokens.map((t: any) => t.token),
          'Pagamento aprovado! 🎉',
          'Seu pagamento via cartão foi confirmado. Aproveite o DocePreço!',
          { screen: 'Home' }
        );
      }

      notifyPremiumEvent(user.companyName, 'INITIAL_PURCHASE', 'card');
      console.log(`[Stripe] Webhook: premium granted to ${userId} (${planTier} ${plan})`);
      res.json({ received: true });
    } catch (error) {
      console.error('[Stripe] Webhook processing error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  /** Simple success page shown after payment in the browser. */
  success(_req: Request, res: Response): void {
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pagamento confirmado</title>
<style>
  body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FFF6F0;color:#3D2233;text-align:center;padding:24px}
  .icon{font-size:64px;margin-bottom:16px}
  h1{font-size:24px;margin:0 0 8px}
  p{color:#9A7E8C;font-size:16px;margin:0 0 32px}
  .btn{background:#EA4B92;color:#fff;border:none;border-radius:14px;padding:14px 32px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none}
  .tip{background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:14px 20px;font-size:15px;font-weight:600;color:#15803D}
</style>
</head>
<body>
  <div class="icon">🎉</div>
  <h1>Pagamento confirmado!</h1>
  <p>Sua assinatura está ativa.</p>
  <p style="font-size:14px;color:#9A7E8C;margin-bottom:32px">Feche esta aba e volte ao app — seu acesso será ativado automaticamente.</p>
  <div class="tip">Feche esta aba do navegador</div>
</body>
</html>`);
  }

  /** Simple cancel page shown if user cancels on Stripe. */
  cancel(_req: Request, res: Response): void {
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pagamento cancelado</title>
<style>
  body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FFF6F0;color:#3D2233;text-align:center;padding:24px}
  .icon{font-size:64px;margin-bottom:16px}
  h1{font-size:24px;margin:0 0 8px}
  p{color:#9A7E8C;font-size:16px;margin:0 0 32px}
  .btn{background:#EA4B92;color:#fff;border:none;border-radius:14px;padding:14px 32px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none}
</style>
</head>
<body>
  <div class="icon">😕</div>
  <h1>Pagamento cancelado</h1>
  <p>Nenhuma cobrança foi feita. Feche esta aba e tente novamente no app.</p>
  <div class="tip">Feche esta aba do navegador</div>
</body>
</html>`);
  }
}
