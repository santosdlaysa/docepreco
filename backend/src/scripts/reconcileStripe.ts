/**
 * Reconcilia as assinaturas do Stripe com o acesso gravado no banco.
 *
 * Durante meses o endpoint de webhook esteve inscrito apenas em
 * `checkout.session.completed`, então nenhuma renovação chegou ao servidor e o
 * `premium_until` de quem pagou ficou parado no primeiro ciclo. Reenviar os
 * eventos não resolve tudo: a Stripe só guarda eventos por 30 dias. Este script
 * vai à fonte — lê as assinaturas vigentes e alinha o banco a elas.
 *
 *   npm run reconcile:stripe             lista as divergências (não grava nada)
 *   npm run reconcile:stripe -- --apply  aplica as correções
 *
 * A gravação usa updatePlanTier, que só estende (GREATEST): nunca encurta o
 * acesso de ninguém.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');

import { PostgresUserRepository } from '../infrastructure/repositories/PostgresUserRepository';
import { periodEndOf } from '../presentation/controllers/StripeController';
import { pool } from '../infrastructure/database/connection';

const userRepo = new PostgresUserRepository();
const APPLY = process.argv.includes('--apply');
const VALID = ['active', 'trialing'];

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '—');

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada');
  const stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' });

  console.log(APPLY ? '== Reconciliação Stripe (APLICANDO) ==\n' : '== Reconciliação Stripe (simulação) ==\n');

  let startingAfter: string | undefined;
  let total = 0;
  let semMetadata = 0;
  let ok = 0;
  let corrigir = 0;
  let aplicados = 0;

  for (;;) {
    const page = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    for (const sub of page.data) {
      if (!VALID.includes(sub.status)) continue;
      total++;

      const { userId, plan, tier } = (sub.metadata ?? {}) as Record<string, string>;
      if (!userId || !tier) {
        semMetadata++;
        console.warn(`  ? ${sub.id} — assinatura ${sub.status} sem metadata; confira no painel`);
        continue;
      }

      const periodEnd = periodEndOf(sub);
      if (!periodEnd) {
        console.warn(`  ? ${sub.id} — sem período legível`);
        continue;
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        console.warn(`  ? ${sub.id} — usuário ${userId} não existe mais`);
        continue;
      }

      const atual = user.premiumUntil ? new Date(user.premiumUntil) : null;
      if (atual && atual >= periodEnd) {
        ok++;
        continue;
      }

      corrigir++;
      const planTier = tier === 'master' ? 'master' : 'premium';
      console.log(
        `  ! ${user.email ?? userId} (${planTier} ${plan ?? '?'}) — acesso até ${fmt(atual)}, pago até ${fmt(periodEnd)}`
      );

      if (APPLY) {
        await userRepo.updatePlanTier(userId, planTier, periodEnd, 'card');
        await pool.query(
          `INSERT INTO premium_events (user_id, event_type, source, platform, product_id, expiration_at, store)
           VALUES ($1, 'RENEWAL', 'stripe-reconcile', 'card', $2, $3, 'STRIPE')`,
          [userId, `stripe_${planTier}_${plan ?? 'monthly'}`, periodEnd]
        );
        aplicados++;
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  console.log('\n-----------------------------------------');
  console.log(`assinaturas vigentes .......... ${total}`);
  console.log(`já corretas ................... ${ok}`);
  console.log(`sem metadata (ver manual) ..... ${semMetadata}`);
  console.log(`precisam de correção .......... ${corrigir}`);
  if (APPLY) console.log(`corrigidas .................... ${aplicados}`);
  else if (corrigir) console.log('\nrode de novo com --apply para corrigir');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Falhou:', err);
    await pool.end();
    process.exit(1);
  });
