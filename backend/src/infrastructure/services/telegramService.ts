import { pool } from '../database/connection';
import { PostgresTelegramAlertRepository } from '../repositories/PostgresTelegramAlertRepository';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const alertRepo = new PostgresTelegramAlertRepository();

function sendTelegramMessage(text: string): void {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch((err) => {
    console.error('Telegram notification failed:', err.message);
  });
}

async function isAlertEnabled(key: string): Promise<boolean> {
  try {
    return await alertRepo.isEnabled(key);
  } catch {
    return true; // default enabled if DB not ready
  }
}

function brNow(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ── Existing notifications ──────────────────────────────────────────

export async function sendDailyUserReport(): Promise<void> {
  if (!await isAlertEnabled('daily_report')) return;
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_premium = TRUE)::int AS premium,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS today
    FROM users
  `);
  const { total, premium, today } = rows[0];
  const text = `📊 Relatório diário\n\n👥 Total de usuários: ${total}\n⭐ Premium: ${premium}\n🆕 Novos hoje: ${today}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

export async function notifyNewUser(companyName: string, email: string): Promise<void> {
  if (!await isAlertEnabled('new_user')) return;
  const text = `🆕 Novo cadastro!\n\n🏪 ${companyName}\n📧 ${email}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Premium events ──────────────────────────────────────────────────

const premiumEventLabels: Record<string, string> = {
  INITIAL_PURCHASE: '💎 Nova assinatura',
  RENEWAL: '🔄 Renovação',
  CANCELLATION: '❌ Cancelamento',
  EXPIRATION: '⏰ Expiração',
  UNCANCELLATION: '🔙 Reativação',
  PRODUCT_CHANGE: '🔀 Troca de plano',
  BILLING_ISSUE: '⚠️ Problema de cobrança',
  NON_RENEWING_PURCHASE: '💎 Compra avulsa',
};

export async function notifyPremiumEvent(companyName: string, eventType: string, platform: string | null): Promise<void> {
  if (!await isAlertEnabled('premium_event')) return;
  const label = premiumEventLabels[eventType] || `📌 ${eventType}`;
  const plat = platform ? ` (${platform})` : '';
  const text = `${label}${plat}\n\n🏪 ${companyName}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Sale created ────────────────────────────────────────────────────

export async function notifySale(companyName: string, recipeName: string, quantity: number, totalRevenue: number): Promise<void> {
  if (!await isAlertEnabled('new_sale')) return;
  const revenue = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const text = `🧁 Nova venda!\n\n🏪 ${companyName}\n🍰 ${recipeName} × ${quantity}\n💰 ${revenue}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── User milestone ──────────────────────────────────────────────────

const MILESTONES = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

export async function notifyUserMilestone(total: number): Promise<void> {
  if (!MILESTONES.includes(total)) return;
  if (!await isAlertEnabled('user_milestone')) return;
  const text = `🎉 Marco atingido!\n\n👥 ${total} usuários cadastrados!\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Error & slow API alerts ─────────────────────────────────────────

export async function sendErrorAlert(method: string, path: string, statusCode: number, durationMs: number, errorMessage?: string): Promise<void> {
  if (!await isAlertEnabled('error_alert')) return;
  let text = `🚨 Erro no servidor\n\n${method} ${path}\nStatus: ${statusCode}\nDuração: ${durationMs}ms`;
  if (errorMessage) {
    text += `\nErro: ${errorMessage}`;
  }
  text += `\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

export async function sendSlowApiAlert(method: string, path: string, durationMs: number): Promise<void> {
  if (!await isAlertEnabled('slow_api')) return;
  const text = `🐢 Rota lenta\n\n${method} ${path}\nDuração: ${durationMs}ms\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Daily registration goal progress ────────────────────────────────

export async function sendDailyGoalProgress(opts: { silentIfMet?: boolean } = {}): Promise<void> {
  if (!await isAlertEnabled('goal_progress')) return;
  const { rows: settingRows } = await pool.query(
    `SELECT value FROM app_settings WHERE key = 'daily_registration_goal'`
  );
  const goal = settingRows.length > 0 ? parseInt(settingRows[0].value, 10) : 0;
  if (!goal || goal <= 0) return;

  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS count FROM users
    WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
  `);
  const today = rows[0].count;
  const remaining = Math.max(0, goal - today);
  const percent = Math.min(100, Math.round((today / goal) * 100));

  if (opts.silentIfMet && remaining === 0) return;

  const bar = '█'.repeat(Math.round(percent / 10)) + '░'.repeat(10 - Math.round(percent / 10));
  const status = remaining === 0 ? '🎯 Meta batida!' : `Faltam ${remaining} para bater a meta`;
  const text = `📈 Meta de cadastros\n\n${bar} ${percent}%\n👥 ${today}/${goal} hoje\n${status}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Weekly report ───────────────────────────────────────────────────

export async function sendWeeklyReport(): Promise<void> {
  if (!await isAlertEnabled('weekly_report')) return;
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users,
      (SELECT COUNT(*)::int FROM recipes WHERE created_at >= NOW() - INTERVAL '7 days') AS new_recipes,
      (SELECT COUNT(*)::int FROM sales WHERE created_at >= NOW() - INTERVAL '7 days') AS total_sales,
      (SELECT COALESCE(SUM(total_revenue), 0)::numeric FROM sales WHERE created_at >= NOW() - INTERVAL '7 days') AS week_revenue
  `);
  const { new_users, new_recipes, total_sales, week_revenue } = rows[0];

  const { rows: topUsers } = await pool.query(`
    SELECT u.company_name, COUNT(s.id)::int AS sales_count
    FROM sales s
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY u.id, u.company_name
    ORDER BY sales_count DESC
    LIMIT 5
  `);

  const revenue = Number(week_revenue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  let text = `📊 Relatório semanal\n\n🆕 Novos usuários: ${new_users}\n🍰 Receitas criadas: ${new_recipes}\n🧁 Vendas registradas: ${total_sales}\n💰 Receita total: ${revenue}`;

  if (topUsers.length > 0) {
    text += `\n\n🏆 Top 5 ativos:`;
    topUsers.forEach((u: { company_name: string; sales_count: number }, i: number) => {
      text += `\n${i + 1}. ${u.company_name} (${u.sales_count} vendas)`;
    });
  }

  text += `\n\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}
