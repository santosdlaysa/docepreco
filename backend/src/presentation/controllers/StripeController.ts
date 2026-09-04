import { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');

import { PostgresUserRepository } from '../../infrastructure/repositories/PostgresUserRepository';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';
import { notifyPremiumEvent } from '../../infrastructure/services/telegramService';
import { sendPushNotifications } from '../../infrastructure/services/pushService';
import { pool } from '../../infrastructure/database/connection';
import { AuthRequest } from '../middleware/authMiddleware';
import { isValidEmail, INVALID_ACCOUNT_EMAIL_ERROR } from '../../domain/services/email';

const userRepo = new PostgresUserRepository();
const pushTokenRepo = new PostgresPushTokenRepository();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

// Preços em centavos (BRL) por plano/tier (para fallback apenas)
const PRICES: Record<string, Record<string, number>> = {
  premium: { monthly: 1490, annual: 12000 },
  master:  { monthly: 3000, annual: 30000 },
};

const PLAN_DAYS: Record<string, number> = { monthly: 30, annual: 365 };

const PLAN_NAMES: Record<string, Record<string, string>> = {
  premium: { monthly: 'DocePreço Premium Mensal', annual: 'DocePreço Premium Anual' },
  master:  { monthly: 'DocePreço Master Mensal',  annual: 'DocePreço Master Anual' },
};

// Stripe Price IDs for subscriptions (recurring billing)
const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  premium: {
    monthly: 'price_1SnNyT3CuHnNAoVB5EJMM9Ma',
    annual: 'price_1Th8Vn3CuHnNAoVBMOJUX7cK',
  },
  master: {
    monthly: 'price_1Th8W13CuHnNAoVBYV0YGwX9',
    annual: 'price_1Th8WI3CuHnNAoVBWXYBleVj',
  },
};

/**
 * Fim do período pago da assinatura.
 *
 * Da API 2025-03-31.basil em diante a Stripe tirou `current_period_end` do
 * objeto Subscription e passou a expô-lo em cada item — nesta conta a versão é
 * 2026-05-27.dahlia, então `subscription.current_period_end` vem `undefined`.
 * Lemos os itens e mantemos o campo antigo como fallback para assinaturas
 * criadas em versões anteriores.
 */
export function periodEndOf(subscription: any): Date | null {
  const items: any[] = subscription?.items?.data ?? [];
  const fromItems = items
    .map(i => i?.current_period_end)
    .filter((v: any) => typeof v === 'number');

  const epoch = fromItems.length
    ? Math.max(...fromItems)
    : (typeof subscription?.current_period_end === 'number' ? subscription.current_period_end : null);

  return epoch ? new Date(epoch * 1000) : null;
}

/** Id da assinatura de uma fatura, nas duas formas que a API já usou. */
function subscriptionIdOf(invoice: any): string | null {
  const parent = invoice?.parent;
  if (parent?.type === 'subscription_details' || parent?.subscription_details) {
    const sub = parent.subscription_details?.subscription;
    if (sub) return typeof sub === 'string' ? sub : sub.id;
  }
  const legacy = invoice?.subscription;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  return null;
}

/** Só liberamos acesso enquanto a assinatura está de fato valendo. */
const ACTIVE_STATUSES = ['active', 'trialing'];

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

    // Sem isso o Stripe devolve "Invalid email address: ..." como erro 500 genérico
    // e o usuário fica sem entender por que o checkout nunca abre.
    if (!isValidEmail(user.email)) {
      console.error(`[Stripe] Checkout bloqueado: e-mail inválido na conta ${userId} — ${user.email}`);
      res.status(400).json({ success: false, error: INVALID_ACCOUNT_EMAIL_ERROR, code: 'INVALID_ACCOUNT_EMAIL' });
      return;
    }

    try {
      const stripe = getStripe();
      const baseUrl = process.env.APP_BASE_URL ?? 'https://docepreco.onrender.com';
      const priceId = STRIPE_PRICE_IDS[tier]?.[plan];

      if (!priceId) {
        res.status(400).json({ success: false, error: 'Price ID not configured' });
        return;
      }

      // Get trial days from plan config
      let trialDays = 0;
      try {
        const settings = await pool.query(
          `SELECT key, value FROM app_settings WHERE key IN ($1, $2)`,
          [`plan_${tier}_free_days`, 'plan_new_user_trial_tier']
        );
        const settingsMap: Record<string, string> = {};
        for (const row of settings.rows) settingsMap[row.key] = row.value;

        const masterDays = parseInt(settingsMap['plan_master_free_days'] || '3');
        const premiumDays = parseInt(settingsMap['plan_premium_free_days'] || '2');
        trialDays = tier === 'master' ? masterDays : premiumDays;
      } catch (e) {
        console.warn('[Stripe] Failed to get trial config:', e);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: { userId, plan, tier },
          ...(trialDays > 0 && { trial_period_days: trialDays }),
        },
        metadata: { userId, plan, tier },
        success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/stripe/cancel`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (error: any) {
      console.error('[Stripe] createCheckout error:', error?.message ?? error);
      // A mensagem crua do Stripe vem em inglês e vaza detalhe interno — o log acima já a guarda.
      res.status(500).json({ success: false, error: 'Não foi possível abrir o pagamento. Tente novamente.' });
    }
  }

  /**
   * Abre o portal de cobrança do Stripe, onde a pessoa vê a assinatura, troca o
   * cartão e cancela. É o caminho oficial — a Stripe espera que o cancelamento
   * aconteça por lá (ou via API), não numa tela própria.
   * POST /api/stripe/portal
   */
  async portal(req: AuthRequest, res: Response): Promise<void> {
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

      const stripe = getStripe();

      let customerId: string | null = null;
      const saved = await pool.query(`SELECT stripe_customer_id FROM users WHERE id = $1`, [userId]);
      customerId = saved.rows[0]?.stripe_customer_id ?? null;

      if (!customerId && user.email) {
        const found = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = found.data[0]?.id ?? null;
        if (customerId) {
          await pool.query(`UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, [userId, customerId]);
        }
      }

      if (!customerId) {
        res.status(404).json({ success: false, error: 'Não encontramos uma assinatura de cartão nesta conta.' });
        return;
      }

      const baseUrl = process.env.APP_BASE_URL ?? 'https://docepreco.onrender.com';
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/api/stripe/success`,
      });

      res.json({ success: true, data: { url: session.url } });
    } catch (error: any) {
      console.error('[Stripe] portal error:', error?.message ?? error);
      res.status(500).json({ success: false, error: 'Não foi possível abrir o gerenciamento da assinatura.' });
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

    // Handle both one-time payment and subscription events
    const isCheckoutCompleted = event.type === 'checkout.session.completed';
    const isSubscriptionEvent = ['customer.subscription.created', 'customer.subscription.updated'].includes(event.type);
    // Renovação: é a fatura paga que marca o novo ciclo (docs.stripe.com/billing/subscriptions/webhooks).
    const isInvoicePaid = ['invoice.paid', 'invoice.payment_succeeded'].includes(event.type);

    if (!isCheckoutCompleted && !isSubscriptionEvent && !isInvoicePaid) {
      res.json({ received: true });
      return;
    }

    let userId: string | undefined;
    let plan: string | undefined;
    let tier: string | undefined;
    let premiumUntil: Date | null = null;
    let amountCents: number | null = null;
    let currency = 'BRL';

    try {
      if (isCheckoutCompleted) {
        const session = event.data.object;
        ({ userId, plan, tier } = (session.metadata ?? {}) as any);

        if (!userId || !plan || !tier) {
          console.warn('[Stripe] Webhook missing metadata:', session.metadata);
          res.json({ received: true });
          return;
        }

        // Ancoramos no período real da assinatura para que checkout, subscription
        // e fatura cheguem todos à mesma data — é o que torna o webhook idempotente.
        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          try {
            premiumUntil = periodEndOf(await getStripe().subscriptions.retrieve(subId));
          } catch (e: any) {
            console.warn(`[Stripe] Falha ao buscar assinatura ${subId} do checkout:`, e?.message ?? e);
          }
        }
        if (!premiumUntil) {
          const days = PLAN_DAYS[plan] ?? 30;
          premiumUntil = new Date();
          premiumUntil.setDate(premiumUntil.getDate() + days);
        }

        amountCents = typeof session.amount_total === 'number'
          ? session.amount_total
          : (PRICES[tier]?.[plan] ?? null);
        currency = (session.currency ?? 'brl').toUpperCase();

        console.log(`[Stripe] Checkout completed for ${userId} (${tier} ${plan})`);
      } else if (isSubscriptionEvent) {
        // For subscriptions, get metadata from subscription object
        const subscription = event.data.object;
        const metadata = subscription.metadata ?? {};
        ({ userId, plan, tier } = metadata as any);

        if (!userId || !plan || !tier) {
          console.warn('[Stripe] Subscription webhook missing metadata:', metadata);
          res.json({ received: true });
          return;
        }

        // 'updated' também chega em cancelamento/inadimplência — aí não se libera nada.
        if (!ACTIVE_STATUSES.includes(subscription.status)) {
          console.log(`[Stripe] Subscription ${subscription.id} em status '${subscription.status}' — sem liberar acesso`);
          res.json({ received: true });
          return;
        }

        premiumUntil = periodEndOf(subscription);

        console.log(`[Stripe] Subscription event (${event.type}) for ${userId} (${tier} ${plan})`);
      } else if (isInvoicePaid) {
        const invoice = event.data.object;
        const subId = subscriptionIdOf(invoice);

        if (!subId) {
          // Fatura avulsa (não é assinatura) — nada a liberar por aqui.
          res.json({ received: true });
          return;
        }

        // O snapshot do metadata vem na fatura; se faltar, buscamos a assinatura.
        const snapshot = invoice?.parent?.subscription_details?.metadata ?? {};
        ({ userId, plan, tier } = snapshot as any);

        // Buscamos a assinatura de qualquer forma: é dela que saem o período pago
        // e o status atual — a fatura sozinha não diz até quando liberar.
        let subscription: any = null;
        try {
          subscription = await getStripe().subscriptions.retrieve(subId);
        } catch (e: any) {
          console.warn(`[Stripe] Falha ao buscar assinatura ${subId}:`, e?.message ?? e);
        }

        if ((!userId || !plan || !tier) && subscription?.metadata) {
          ({ userId, plan, tier } = subscription.metadata as any);
        }

        if (!userId || !plan || !tier) {
          console.warn(`[Stripe] Fatura paga da assinatura ${subId} sem metadata — nada a liberar`);
          res.json({ received: true });
          return;
        }

        if (subscription && !ACTIVE_STATUSES.includes(subscription.status)) {
          console.log(`[Stripe] Assinatura ${subId} em status '${subscription.status}' — sem liberar acesso`);
          res.json({ received: true });
          return;
        }

        premiumUntil = periodEndOf(subscription ?? {});
        if (!premiumUntil) {
          // Último recurso: o período da linha da fatura.
          const lineEnd = invoice?.lines?.data?.[0]?.period?.end;
          if (typeof lineEnd === 'number') premiumUntil = new Date(lineEnd * 1000);
        }

        amountCents = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : null;
        currency = (invoice.currency ?? 'brl').toUpperCase();

        console.log(`[Stripe] Fatura paga (${event.type}) de ${userId} (${tier} ${plan}) — assinatura ${subId}`);
      }

      if (!userId || !plan || !tier) {
        res.json({ received: true });
        return;
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        console.warn(`[Stripe] Webhook: user ${userId} not found`);
        res.json({ received: true });
        return;
      }

      const planTier = tier === 'master' ? 'master' : 'premium';

      if (!premiumUntil) {
        const days = PLAN_DAYS[plan] ?? 30;
        premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + days);
      }

      await userRepo.updatePlanTier(userId, planTier, premiumUntil, 'card');

      // Guardamos o cliente do Stripe para abrir o portal de cobrança depois sem
      // depender de procurar por e-mail (que muda e pode repetir entre contas).
      const customer = event.data.object?.customer;
      if (customer) {
        const customerId = typeof customer === 'string' ? customer : customer.id;
        await pool.query(
          `UPDATE users SET stripe_customer_id = $2 WHERE id = $1 AND stripe_customer_id IS DISTINCT FROM $2`,
          [userId, customerId]
        );
      }

      // Uma mesma cobrança chega como checkout.session.completed, customer.subscription.*
      // e invoice.paid. Como os três agora apontam para o mesmo fim de período, um
      // registro já gravado significa que o ciclo foi processado: o acesso acima é
      // idempotente, mas o histórico e o push não podem sair repetidos.
      const already = await pool.query(
        `SELECT 1 FROM premium_events
          WHERE user_id = $1 AND source = 'stripe' AND expiration_at = $2
          LIMIT 1`,
        [userId, premiumUntil]
      );
      if ((already.rowCount ?? 0) > 0) {
        console.log(`[Stripe] Ciclo até ${premiumUntil.toISOString()} já registrado para ${userId} — evento ignorado`);
        res.json({ received: true });
        return;
      }

      amountCents = amountCents ?? (PRICES[planTier]?.[plan] ?? null);

      // A fatura diz o motivo da cobrança; nos demais eventos, só a compra é inicial.
      const billingReason = isInvoicePaid ? event.data.object?.billing_reason : null;
      const isFirstCharge = isCheckoutCompleted
        || event.type === 'customer.subscription.created'
        || billingReason === 'subscription_create';
      const eventType = isFirstCharge ? 'INITIAL_PURCHASE' : 'RENEWAL';

      await pool.query(
        `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store, amount_cents, currency)
         VALUES ($1, $2, 'stripe', 'card', $3, $4, 'STRIPE', $5, $6)`,
        [userId, eventType, `stripe_${planTier}_${plan}`, premiumUntil, amountCents, currency]
      );

      const tokens = await pushTokenRepo.findByUserId(userId);
      if (tokens.length > 0) {
        await sendPushNotifications(
          tokens.map((t: any) => t.token),
          isFirstCharge ? 'Pagamento aprovado! 🎉' : 'Assinatura renovada ✨',
          isFirstCharge
            ? 'Seu pagamento via cartão foi confirmado. Aproveite o DocePreço!'
            : 'Sua assinatura foi renovada automaticamente.',
          { screen: 'Home' }
        );
      }

      notifyPremiumEvent(user.companyName, eventType, 'card');
      console.log(`[Stripe] Premium granted to ${userId} (${planTier} ${plan}) until ${premiumUntil.toISOString()}`);
      res.json({ received: true });
    } catch (error) {
      console.error('[Stripe] Webhook processing error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  /**
   * Check if user has a valid payment method saved in Stripe.
   * Used to validate if user can activate trial.
   * GET /api/stripe/has-payment-method
   */
  async hasPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
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

      const stripe = getStripe();

      // Find or create Stripe customer for this user
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        // No Stripe customer exists yet — no payment method
        res.json({ success: true, data: { hasPaymentMethod: false } });
        return;
      }

      const customerId = customers.data[0].id;

      // Check if customer has saved payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        limit: 1,
      });

      const hasPaymentMethod = paymentMethods.data.length > 0;
      res.json({ success: true, data: { hasPaymentMethod } });
    } catch (error: any) {
      console.error('[Stripe] hasPaymentMethod error:', error?.message ?? error);
      res.status(500).json({ success: false, error: error?.message ?? 'Failed to check payment method' });
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
