import { pool } from '../database/connection';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';
import { PostgresNotificationTemplateRepository } from '../repositories/PostgresNotificationTemplateRepository';
import { PostgresTipRepository } from '../repositories/PostgresTipRepository';
import { sendWebPush, webPushEnabled } from './webPushService';

/**
 * Lembretes que o APP agenda localmente no aparelho (mobile/src/presentation/
 * utils/notifications.ts) e que, na web, precisam sair do servidor. Vão SÓ para
 * assinaturas web (platform = 'web') — o app continua agendando os dele, então
 * não há duplicidade no celular. Mesmos templates (painel admin) e fallbacks.
 *
 * O "registrar vendas do dia" (daily_sales, 19h no app) NÃO é replicado: o
 * resumo de vendas do servidor (dailySalesNotificationService) já vai para
 * todos os push_tokens, inclusive os da web, com o lembrete de registrar.
 */

const tokenRepo = new PostgresPushTokenRepository();
const templateRepo = new PostgresNotificationTemplateRepository();
const tipRepo = new PostgresTipRepository();

export const FALLBACK_TEMPLATES: Record<string, { title: string; body: string }> = {
  inactivity_2d: { title: 'Sentimos sua falta! 🧁', body: 'Suas receitas estao te esperando! Abra o DocePreco e confira seus calculos.' },
  inactivity_5d: { title: 'Faz tempo! 🍰', body: 'Faz tempo que voce nao aparece! Seus doces precisam de precos atualizados.' },
  weekly_reminder: { title: 'Começo de semana! 📊', body: 'Confira se os precos dos ingredientes mudaram. Manter tudo atualizado é o segredo!' },
};

const FALLBACK_TIPS = [
  'Dica: revise seus preços a cada 15 dias para acompanhar a variacao dos ingredientes!',
  'Voce sabia? Embalar bem seus doces pode aumentar o valor percebido em ate 30%!',
  'Lembre-se: seu tempo tambem e um ingrediente! Nao esqueca de incluir a mao de obra.',
  'Precificar corretamente e o primeiro passo para um negocio lucrativo. Voce esta no caminho certo!',
];

/** Template ativo do painel; sem cadastro usa o fallback do app; desativado → null. */
export async function resolveTemplate(slug: string): Promise<{ title: string; body: string } | null> {
  const t = await templateRepo.findBySlug(slug).catch(() => null);
  if (t) return t.isActive ? { title: t.title, body: t.body } : null;
  return FALLBACK_TEMPLATES[slug] ?? null;
}

async function sendToAllWeb(slug: string, content: { title: string; body: string }): Promise<number> {
  const rows = await tokenRepo.findWebTokensByUserIds();
  if (rows.length === 0) return 0;
  const delivered = await sendWebPush(rows.map(r => r.token), content.title, content.body, { type: 'reminder', slug });
  return delivered.length;
}

/** Segunda 9h — lembrete semanal. */
export async function sendWebWeeklyReminder(): Promise<number> {
  if (!webPushEnabled()) return 0;
  const content = await resolveTemplate('weekly_reminder');
  return content ? sendToAllWeb('weekly_reminder', content) : 0;
}

/** Todo dia 10h — dica motivacional (mesma lista do painel). */
export async function sendWebDailyTip(): Promise<number> {
  if (!webPushEnabled()) return 0;
  const tips = await tipRepo.findActive().catch(() => []);
  const list = tips.length > 0 ? tips.map(t => t.message) : FALLBACK_TIPS;
  const tip = list[Math.floor(Math.random() * list.length)];
  return sendToAllWeb('tip', { title: 'Dica DocePreco 💡', body: tip });
}

/**
 * Roda de hora em hora: avisa quem completou 48h (inactivity_2d) ou 120h
 * (inactivity_5d) sem usar o Doce Preço (last_seen_at é atualizado a cada
 * requisição autenticada, de qualquer plataforma). A janela de 1h garante um
 * único envio por marco.
 */
export async function sendWebInactivityReminders(): Promise<number> {
  if (!webPushEnabled()) return 0;
  let sent = 0;
  for (const [slug, hours] of [['inactivity_2d', 48], ['inactivity_5d', 120]] as const) {
    const content = await resolveTemplate(slug);
    if (!content) continue;
    const users = await pool.query(
      `SELECT id FROM users
       WHERE COALESCE(is_active, TRUE)
         AND last_seen_at <= NOW() - ($1 || ' hours')::interval
         AND last_seen_at >  NOW() - ($1 || ' hours')::interval - INTERVAL '1 hour'`,
      [String(hours)]
    );
    const ids = users.rows.map((r: { id: string }) => r.id);
    if (ids.length === 0) continue;
    const rows = await tokenRepo.findWebTokensByUserIds(ids);
    if (rows.length === 0) continue;
    sent += (await sendWebPush(rows.map(r => r.token), content.title, content.body, { type: 'reminder', slug })).length;
  }
  return sent;
}
