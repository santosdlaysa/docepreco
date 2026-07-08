import { pool } from '../database/connection';
import { PostgresNotificationRepository } from '../repositories/PostgresNotificationRepository';
import { sendPushNotifications } from './pushService';

const TZ = 'America/Sao_Paulo';

export const SALES_SUMMARY_SLUGS = [
  'sales_summary_midday',
  'sales_summary_afternoon',
  'sales_summary_evening',
] as const;

export type SalesSummarySlug = (typeof SALES_SUMMARY_SLUGS)[number];

export function isSalesSummarySlug(slug: string): slug is SalesSummarySlug {
  return (SALES_SUMMARY_SLUGS as readonly string[]).includes(slug);
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function fillPlaceholders(
  text: string,
  values: { nome: string; vendas: string; valor: string }
): string {
  return text
    .replace(/\{nome\}/g, values.nome)
    .replace(/\{vendas\}/g, values.vendas)
    .replace(/\{valor\}/g, values.valor);
}

function nowInSaoPaulo(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  return { hour: get('hour'), minute: get('minute') };
}

/**
 * Envia um push individual com o resumo das vendas do dia para cada usuário
 * que registrou pelo menos uma venda hoje e possui token de push.
 * Usuários sem vendas no dia não recebem nada (evita spam de "R$ 0,00" —
 * o lembrete local das 19h já cobre quem não registrou vendas).
 *
 * O título e o corpo vêm do template (editável no painel admin) e aceitam
 * os placeholders {nome}, {vendas} e {valor}.
 */
export async function sendDailySalesSummary(template: {
  slug: string;
  title: string;
  body: string;
}): Promise<{ notificationId: string; users: number; devices: number }> {
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
         AND s.sale_date = (NOW() AT TIME ZONE '${TZ}')::date
     ) t ON t.sale_count > 0
     JOIN push_tokens pt ON pt.user_id = u.id
     WHERE COALESCE(u.is_active, TRUE)
     GROUP BY u.id, u.company_name, t.revenue, t.sale_count`
  );

  let sentCount = 0;
  for (const row of result.rows) {
    const values = {
      nome: row.companyName as string,
      vendas: row.saleCount === 1 ? '1 venda' : `${row.saleCount} vendas`,
      valor: fmtBRL(row.revenue),
    };
    sentCount += await sendPushNotifications(
      row.tokens,
      fillPlaceholders(template.title, values),
      fillPlaceholders(template.body, values),
      { type: 'daily_sales_summary', slug: template.slug }
    );
  }

  // Registro agregado para aparecer no painel admin (uma linha por disparo)
  const notifRepo = new PostgresNotificationRepository();
  const notif = await notifRepo.create({
    title: template.title,
    body: `Resumo de vendas do dia enviado para ${result.rows.length} usuário(s) com vendas hoje.`,
    dataJson: JSON.stringify({ type: 'daily_sales_summary', slug: template.slug }),
    target: 'all',
    status: 'sent',
  });
  await notifRepo.markSent(notif.id, sentCount);

  console.log(
    `[SalesSummary ${template.slug}] ${result.rows.length} usuário(s), ${sentCount} dispositivo(s)`
  );
  return { notificationId: notif.id, users: result.rows.length, devices: sentCount };
}

/**
 * Roda a cada minuto: dispara os resumos de vendas cujos templates estão
 * ativos e agendados para o horário atual (fuso America/Sao_Paulo).
 * Horário e textos são configuráveis no painel admin (Dicas & Notificações).
 */
export async function checkSalesSummarySchedules(): Promise<void> {
  const { hour, minute } = nowInSaoPaulo();
  const result = await pool.query(
    `SELECT slug, title, body
     FROM notification_templates
     WHERE slug = ANY($1)
       AND is_active = TRUE
       AND schedule_hour = $2
       AND COALESCE(schedule_minute, 0) = $3`,
    [[...SALES_SUMMARY_SLUGS], hour, minute]
  );
  for (const template of result.rows) {
    await sendDailySalesSummary(template);
  }
}
