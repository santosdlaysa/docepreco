import { pool } from '../database/connection';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

function brNow(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ── Existing notifications ──────────────────────────────────────────

export async function sendDailyUserReport(): Promise<void> {
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

export function notifyNewUser(companyName: string, email: string): void {
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

export function notifyPremiumEvent(companyName: string, eventType: string, platform: string | null): void {
  const label = premiumEventLabels[eventType] || `📌 ${eventType}`;
  const plat = platform ? ` (${platform})` : '';
  const text = `${label}${plat}\n\n🏪 ${companyName}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Sale created ────────────────────────────────────────────────────

export function notifySale(companyName: string, recipeName: string, quantity: number, totalRevenue: number): void {
  const revenue = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const text = `🧁 Nova venda!\n\n🏪 ${companyName}\n🍰 ${recipeName} × ${quantity}\n💰 ${revenue}\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── User milestone ──────────────────────────────────────────────────

const MILESTONES = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

export function notifyUserMilestone(total: number): void {
  if (!MILESTONES.includes(total)) return;
  const text = `🎉 Marco atingido!\n\n👥 ${total} usuários cadastrados!\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Error & slow API alerts ─────────────────────────────────────────

export function sendErrorAlert(method: string, path: string, statusCode: number, durationMs: number, errorMessage?: string): void {
  let text = `🚨 Erro no servidor\n\n${method} ${path}\nStatus: ${statusCode}\nDuração: ${durationMs}ms`;
  if (errorMessage) {
    text += `\nErro: ${errorMessage}`;
  }
  text += `\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

export function sendSlowApiAlert(method: string, path: string, durationMs: number): void {
  const text = `🐢 Rota lenta\n\n${method} ${path}\nDuração: ${durationMs}ms\n🕐 ${brNow()}`;
  sendTelegramMessage(text);
}

// ── Weekly report ───────────────────────────────────────────────────

export async function sendWeeklyReport(): Promise<void> {
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
