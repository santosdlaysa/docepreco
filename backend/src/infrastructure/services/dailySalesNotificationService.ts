import { pool } from '../database/connection';
import { PostgresNotificationRepository } from '../repositories/PostgresNotificationRepository';
import { sendPushNotifications } from './pushService';

export type SalesSummarySlot = 'midday' | 'afternoon' | 'evening';

const SLOT_LABELS: Record<SalesSummarySlot, string> = {
  midday: '12h',
  afternoon: '17h',
  evening: '19h',
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function buildMessage(
  slot: SalesSummarySlot,
  companyName: string,
  saleCount: number,
  revenue: number
): { title: string; body: string } {
  const vendas = saleCount === 1 ? '1 venda' : `${saleCount} vendas`;
  const valor = fmtBRL(revenue);

  if (slot === 'evening') {
    return {
      title: 'Resumo de vendas de hoje 🎉',
      body: `${companyName}, você registrou ${vendas} hoje, somando ${valor}. Ótimo trabalho!`,
    };
  }
  return {
    title: `Parcial de vendas — ${SLOT_LABELS[slot]} 🧁`,
    body: `${companyName}, até agora você registrou ${vendas} hoje, somando ${valor}. Continue assim!`,
  };
}

/**
 * Envia um push individual com o resumo das vendas do dia para cada usuário
 * que registrou pelo menos uma venda hoje e possui token de push.
 * Usuários sem vendas no dia não recebem nada (evita spam de "R$ 0,00" —
 * o lembrete local das 19h já cobre quem não registrou vendas).
 */
export async function sendDailySalesSummary(slot: SalesSummarySlot): Promise<void> {
  const result = await pool.query(
    `SELECT u.id,
            u.company_name          AS "companyName",
            t.revenue,
            t.sale_count            AS "saleCount",
            ARRAY_AGG(pt.token)     AS tokens
     FROM users u
     JOIN LATERAL (
       SELECT COALESCE(SUM(s.total_revenue), 0)::float AS revenue,
              COUNT(*)::int AS sale_count
       FROM sales s
       WHERE s.user_id = u.id
         AND s.sale_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
     ) t ON t.sale_count > 0
     JOIN push_tokens pt ON pt.user_id = u.id
     WHERE COALESCE(u.is_active, TRUE)
     GROUP BY u.id, u.company_name, t.revenue, t.sale_count`
  );

  if (result.rows.length === 0) {
    console.log(`[SalesSummary ${SLOT_LABELS[slot]}] Nenhum usuário com vendas hoje`);
    return;
  }

  let sentCount = 0;
  for (const row of result.rows) {
    const { title, body } = buildMessage(slot, row.companyName, row.saleCount, row.revenue);
    sentCount += await sendPushNotifications(row.tokens, title, body, {
      type: 'daily_sales_summary',
      slot,
    });
  }

  // Registro agregado para aparecer no painel admin (uma linha por disparo)
  const notifRepo = new PostgresNotificationRepository();
  const notif = await notifRepo.create({
    title: `Resumo de vendas (${SLOT_LABELS[slot]})`,
    body: `Parcial de vendas do dia enviada para ${result.rows.length} usuário(s).`,
    dataJson: JSON.stringify({ type: 'daily_sales_summary', slot }),
    target: 'all',
    status: 'sent',
  });
  await notifRepo.markSent(notif.id, sentCount);

  console.log(`[SalesSummary ${SLOT_LABELS[slot]}] ${result.rows.length} usuário(s), ${sentCount} dispositivo(s)`);
}
