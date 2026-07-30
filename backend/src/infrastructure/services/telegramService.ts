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
    return true;
  }
}

async function getTemplate(key: string): Promise<string | null> {
  try {
    return await alertRepo.getTemplate(key);
  } catch {
    return null;
  }
}

function applyTemplate(template: string, vars: Record<string, string | number>): string {
  let text = template;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return text;
}

function brNow(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ── Alerts ──────────────────────────────────────────────────────────

export async function notifyNewUser(companyName: string, email: string, platform?: string | null): Promise<void> {
  if (!await isAlertEnabled('new_user')) return;
  const tpl = await getTemplate('new_user');
  const platformIcon = platform === 'ios' ? '🍎 iOS' : platform === 'android' ? '🤖 Android' : '📱 Web';
  const fallback = `🆕 Novo cadastro!\n\n🏪 ${companyName}\n📧 ${email}\n${platformIcon}\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { companyName, email, platform: platformIcon, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

export async function notifySale(companyName: string, recipeName: string, quantity: number, totalRevenue: number): Promise<void> {
  if (!await isAlertEnabled('new_sale')) return;
  const revenue = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const tpl = await getTemplate('new_sale');
  const fallback = `🧁 Nova venda!\n\n🏪 ${companyName}\n🍰 ${recipeName} × ${quantity}\n💰 ${revenue}\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { companyName, recipeName, quantity, revenue, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

const premiumEventLabels: Record<string, string> = {
  INITIAL_PURCHASE: '💎 Nova assinatura',
  RENEWAL: '🔄 Renovação',
  CANCELLATION: '❌ Cancelamento',
  EXPIRATION: '⏰ Expiração',
  UNCANCELLATION: '🔙 Reativação',
  PRODUCT_CHANGE: '🔀 Troca de plano',
  BILLING_ISSUE: '⚠️ Problema de cobrança',
  NON_RENEWING_PURCHASE: '💎 Compra avulsa',
  PIX_REQUEST: '🟡 Solicitação PIX',
  PIX_APPROVED: '✅ PIX aprovado',
};

export async function notifyPremiumEvent(companyName: string, eventType: string, platform: string | null): Promise<void> {
  if (!await isAlertEnabled('premium_event')) return;
  const eventLabel = premiumEventLabels[eventType] || `📌 ${eventType}`;
  const plat = platform ? ` (${platform})` : '';
  const tpl = await getTemplate('premium_event');
  const fallback = `${eventLabel}${plat}\n\n🏪 ${companyName}\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { eventLabel: eventLabel + plat, companyName, eventType, platform: platform ?? '', time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

const MILESTONES = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

export async function notifyUserMilestone(total: number): Promise<void> {
  if (!MILESTONES.includes(total)) return;
  if (!await isAlertEnabled('user_milestone')) return;
  const tpl = await getTemplate('user_milestone');
  const fallback = `🎉 Marco atingido!\n\n👥 ${total} usuários cadastrados!\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { total, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

export async function sendErrorAlert(method: string, path: string, statusCode: number, durationMs: number, errorMessage?: string): Promise<void> {
  if (!await isAlertEnabled('error_alert')) return;
  const tpl = await getTemplate('error_alert');
  let fallback = `🚨 Erro no servidor\n\n${method} ${path}\nStatus: ${statusCode}\nDuração: ${durationMs}ms`;
  if (errorMessage) fallback += `\nErro: ${errorMessage}`;
  fallback += `\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { method, path, statusCode, duration: durationMs, error: errorMessage ?? '', time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

export async function notifySupportMessage(companyName: string, email: string, message: string): Promise<void> {
  if (!await isAlertEnabled('support_message')) return;
  const preview = message.length > 100 ? message.substring(0, 100) + '…' : message;
  const tpl = await getTemplate('support_message');
  const fallback = `💬 Nova mensagem no suporte!\n\n🏪 ${companyName}\n📧 ${email}\n\n📝 ${preview}\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { companyName, email, message: preview, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

export async function notifyPixRequest(companyName: string, email: string, planLabel: string, amountCents: number): Promise<void> {
  if (!await isAlertEnabled('pix_request')) return;
  const value = (amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const tpl = await getTemplate('pix_request');
  const fallback = `🟡 Nova solicitação PIX!\n\n🏪 ${companyName}\n📧 ${email}\n📋 Plano: ${planLabel}\n💰 Valor: ${value}\n🕐 ${brNow()}\n\n⚠️ Verifique o pagamento e aprove no painel admin.`;
  const text = tpl ? applyTemplate(tpl, { companyName, email, planLabel, value, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

// ── Reports ─────────────────────────────────────────────────────────

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

  // Quantidade de vendas por usuário (hoje) — em vez de notificar cada venda
  const { rows: salesByUser } = await pool.query(`
    SELECT u.company_name, COUNT(s.id)::int AS sales_count
    FROM sales s
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= NOW() - INTERVAL '1 day'
    GROUP BY u.id, u.company_name
    ORDER BY sales_count DESC
    LIMIT 10
  `);
  const totalSalesToday = salesByUser.reduce(
    (acc: number, u: { sales_count: number }) => acc + u.sales_count,
    0
  );

  const tpl = await getTemplate('daily_report');
  const base = tpl
    ? applyTemplate(tpl, { total, premium, today, salesToday: totalSalesToday, time: brNow() })
    : `📊 Relatório diário\n\n👥 Total de usuários: ${total}\n⭐ Premium: ${premium}\n🆕 Novos hoje: ${today}\n🧁 Vendas hoje: ${totalSalesToday}\n🕐 ${brNow()}`;

  let text = base;
  if (salesByUser.length > 0) {
    text += `\n\n🧁 Vendas por usuário (hoje):`;
    salesByUser.forEach((u: { company_name: string; sales_count: number }, i: number) => {
      text += `\n${i + 1}. ${u.company_name} (${u.sales_count} vendas)`;
    });
  }
  sendTelegramMessage(text);
}

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

  const progressBar = '█'.repeat(Math.round(percent / 10)) + '░'.repeat(10 - Math.round(percent / 10));
  const status = remaining === 0 ? '🎯 Meta batida!' : `Faltam ${remaining} para bater a meta`;
  const tpl = await getTemplate('goal_progress');
  const fallback = `📈 Meta de cadastros\n\n${progressBar} ${percent}%\n👥 ${today}/${goal} hoje\n${status}\n🕐 ${brNow()}`;
  const text = tpl ? applyTemplate(tpl, { progressBar, percent, today, goal, status, time: brNow() }) : fallback;
  sendTelegramMessage(text);
}

/**
 * Health check periódico enviado ao Telegram. Verifica banco (SELECT 1) e a
 * camada HTTP (self-ping em /api/health) e reporta uptime/memória.
 *
 * @param opts.alertOnly quando true, só envia mensagem se algo estiver com
 *   problema (modo silencioso — não manda o "tudo ok" a cada intervalo).
 */
export async function sendHealthReport(opts: { alertOnly?: boolean } = {}): Promise<void> {
  if (!await isAlertEnabled('health_check')) return;

  // 1) Banco: ping + latência
  let dbOk = false;
  let dbLatency = 0;
  try {
    const t = Date.now();
    await pool.query('SELECT 1');
    dbLatency = Date.now() - t;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  // 2) HTTP: self-ping para confirmar que o Express está respondendo
  let httpOk = false;
  let httpStatus = 0;
  let httpLatency = 0;
  const port = process.env.PORT || 3000;
  try {
    const t = Date.now();
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });
    httpLatency = Date.now() - t;
    httpStatus = r.status;
    httpOk = r.ok;
  } catch {
    httpOk = false;
  }

  const healthy = dbOk && httpOk;
  if (opts.alertOnly && healthy) return;

  const uptime = process.uptime();
  const uptimeStr = uptime >= 3600
    ? `${Math.floor(uptime / 3600)}h${Math.floor((uptime % 3600) / 60)}m`
    : `${Math.floor(uptime / 60)}m`;
  const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);

  const icon = healthy ? '✅' : '🚨';
  const title = healthy ? 'API operando normalmente' : 'API COM PROBLEMAS!';
  const dbLine = dbOk ? `🟢 Banco: OK (${dbLatency}ms)` : '🔴 Banco: FORA';
  const httpLine = httpOk
    ? `🟢 HTTP: OK (${httpStatus}, ${httpLatency}ms)`
    : `🔴 HTTP: FORA (${httpStatus || 'sem resposta'})`;

  const tpl = await getTemplate('health_check');
  const fallback = `${icon} ${title}\n\n${dbLine}\n${httpLine}\n⏱️ Uptime: ${uptimeStr}\n💾 Memória: ${mem} MB\n🕐 ${brNow()}`;
  const text = tpl
    ? applyTemplate(tpl, { icon, title, db: dbLine, http: httpLine, uptime: uptimeStr, mem, time: brNow() })
    : fallback;
  sendTelegramMessage(text);
}

// ── Segurança ───────────────────────────────────────────────────────

/** Janela (min) analisada a cada execução. Casada com o cron em server.ts. */
export const SECURITY_WINDOW_MIN = 10;
/** Respostas 401/403/429 do mesmo IP na janela para virar suspeito. */
const IP_ABUSE_THRESHOLD = 15;
/** Falhas de login no mesmo e-mail na janela (possível brute force). */
const LOGIN_FAIL_THRESHOLD = 5;

/**
 * Varredura periódica do request_logs em busca de padrões de acesso suspeito:
 * brute force de senha, fuçada em rotas admin e rate limit estourado. Só manda
 * mensagem ao Telegram se algo cruzar os limiares — silencioso por natureza.
 *
 * Roda num cron interno a cada SECURITY_WINDOW_MIN minutos (ver server.ts): a
 * janela analisada = intervalo entre execuções, evitando realertar o mesmo
 * ataque em excesso. Detalhes completos ficam no painel → Segurança.
 */
export async function sendSecurityAlert(): Promise<void> {
  if (!await isAlertEnabled('security_alert')) return;

  // Constante derivada de número fixo — sem risco de injeção.
  const win = `${SECURITY_WINDOW_MIN} minutes`;

  // 1) IPs com muitas respostas de acesso negado / rate limit
  const { rows: ips } = await pool.query(
    `SELECT ip,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status_code IN (401, 403))::int AS unauthorized,
            COUNT(*) FILTER (WHERE status_code = 429)::int AS rate_limited
     FROM request_logs
     WHERE ts >= NOW() - INTERVAL '${win}'
       AND status_code IN (401, 403, 429)
       AND ip IS NOT NULL
     GROUP BY ip
     HAVING COUNT(*) >= $1
     ORDER BY total DESC
     LIMIT 10`,
    [IP_ABUSE_THRESHOLD]
  );

  // 2) Falhas repetidas de login no mesmo e-mail (brute force de conta)
  const { rows: logins } = await pool.query(
    `SELECT body_email AS email,
            COUNT(*)::int AS attempts,
            COUNT(DISTINCT ip)::int AS ips
     FROM request_logs
     WHERE ts >= NOW() - INTERVAL '${win}'
       AND path = '/api/auth/login'
       AND status_code >= 400
       AND body_email IS NOT NULL
     GROUP BY body_email
     HAVING COUNT(*) >= $1
     ORDER BY attempts DESC
     LIMIT 10`,
    [LOGIN_FAIL_THRESHOLD]
  );

  // 3) Tentativas de acessar rotas admin sem autorização
  const { rows: adminProbes } = await pool.query(
    `SELECT ip, COUNT(*)::int AS attempts
     FROM request_logs
     WHERE ts >= NOW() - INTERVAL '${win}'
       AND path LIKE '/api/admin%'
       AND status_code IN (401, 403)
       AND ip IS NOT NULL
     GROUP BY ip
     ORDER BY attempts DESC
     LIMIT 10`
  );

  if (ips.length === 0 && logins.length === 0 && adminProbes.length === 0) return;

  let text = `🛡️ Alerta de segurança\n\nPadrões suspeitos nos últimos ${SECURITY_WINDOW_MIN} min:`;

  if (ips.length) {
    text += `\n\n🚧 IPs com acesso negado/bloqueado:`;
    for (const r of ips) {
      text += `\n• ${r.ip} — ${r.total}x (401/403: ${r.unauthorized}, 429: ${r.rate_limited})`;
    }
  }
  if (logins.length) {
    text += `\n\n🔑 Falhas de login (possível brute force):`;
    for (const r of logins) {
      text += `\n• ${r.email} — ${r.attempts} tentativas de ${r.ips} IP(s)`;
    }
  }
  if (adminProbes.length) {
    text += `\n\n⛔ Tentativas em rotas admin:`;
    for (const r of adminProbes) {
      text += `\n• ${r.ip} — ${r.attempts}x`;
    }
  }
  text += `\n\n🕐 ${brNow()}\n🔎 Detalhes no painel → Segurança`;

  sendTelegramMessage(text);
}

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
  const tpl = await getTemplate('weekly_report');

  if (tpl) {
    let text = applyTemplate(tpl, { newUsers: new_users, newRecipes: new_recipes, totalSales: total_sales, revenue, time: brNow() });
    if (topUsers.length > 0) {
      text += `\n\n🏆 Top 5 ativos:`;
      topUsers.forEach((u: { company_name: string; sales_count: number }, i: number) => {
        text += `\n${i + 1}. ${u.company_name} (${u.sales_count} vendas)`;
      });
    }
    sendTelegramMessage(text);
  } else {
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
}
