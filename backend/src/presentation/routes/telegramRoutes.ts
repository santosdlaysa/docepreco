import { Router, Request, Response } from 'express';
import { sendDailyUserReport, sendWeeklyReport, sendDailyGoalProgress } from '../../infrastructure/services/telegramService';
import { sendBulkUpdateEmail } from '../../infrastructure/services/emailService';
import { fetchDownloadsLastDays } from '../../infrastructure/services/appStoreConnectService';
import { pool } from '../../infrastructure/database/connection';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegramReply(text: string): void {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(() => {});
}

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  // Autenticação do webhook: o Telegram envia o secret configurado no setWebhook
  // no header X-Telegram-Bot-Api-Secret-Token. Se TELEGRAM_WEBHOOK_SECRET estiver
  // definido, exigimos a correspondência. Caso contrário, fazemos fallback para a
  // allowlist de chat: só processa mensagens vindas do TELEGRAM_CHAT_ID.
  // Sem isso, qualquer um poderia POSTar /webhook e disparar comandos (ex.: e-mail em massa).
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
      return res.sendStatus(401);
    }
  } else {
    const chatId = req.body?.message?.chat?.id ?? req.body?.message?.from?.id;
    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    if (!allowedChatId || String(chatId) !== String(allowedChatId)) {
      return res.sendStatus(401);
    }
  }

  const message = req.body?.message;
  if (!message) return res.sendStatus(200);

  const text: string = (message.text || '').split('@')[0];

  try {
  switch (text) {
    case '/relatorio':
      await sendDailyUserReport();
      break;

    case '/semanal':
      await sendWeeklyReport();
      break;

    case '/meta': {
      const { rows } = await pool.query(
        `SELECT value FROM app_settings WHERE key = 'daily_registration_goal'`
      );
      const goal = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;
      if (!goal || goal <= 0) {
        sendTelegramReply('⚠️ Nenhuma meta de cadastros definida. Configure no painel admin.');
      } else {
        await sendDailyGoalProgress();
      }
      break;
    }

    case '/premium': {
      const { rows } = await pool.query(`
        SELECT company_name, email, premium_platform,
               premium_until::text
        FROM users WHERE is_premium = TRUE
        ORDER BY premium_until DESC NULLS LAST
      `);
      if (rows.length === 0) {
        sendTelegramReply('⭐ Nenhum usuario premium no momento.');
      } else {
        let msg = `⭐ Usuarios premium (${rows.length}):\n`;
        rows.forEach((u: { company_name: string; email: string; premium_platform: string | null; premium_until: string | null }, i: number) => {
          const until = u.premium_until ? u.premium_until.split('T')[0] : 'sem expiracao';
          const plat = u.premium_platform || '?';
          msg += `\n${i + 1}. ${u.company_name} (${plat}) — ate ${until}`;
        });
        sendTelegramReply(msg);
      }
      break;
    }

    case '/vendashoje': {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(total_revenue), 0)::numeric AS revenue
        FROM sales
        WHERE sale_date = CURRENT_DATE
      `);
      const { total, revenue } = rows[0];
      const rev = Number(revenue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      sendTelegramReply(`🧁 Vendas de hoje\n\n📦 ${total} vendas\n💰 ${rev}`);
      break;
    }

    case '/top': {
      const { rows } = await pool.query(`
        SELECT u.company_name, COUNT(s.id)::int AS sales_count,
               COALESCE(SUM(s.total_revenue), 0)::numeric AS revenue
        FROM sales s
        JOIN users u ON u.id = s.user_id
        WHERE s.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY u.id, u.company_name
        ORDER BY revenue DESC
        LIMIT 10
      `);
      if (rows.length === 0) {
        sendTelegramReply('🏆 Nenhuma venda nos ultimos 30 dias.');
      } else {
        let msg = '🏆 Top 10 usuarios (30 dias):\n';
        rows.forEach((u: { company_name: string; sales_count: number; revenue: string }, i: number) => {
          const rev = Number(u.revenue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          msg += `\n${i + 1}. ${u.company_name} — ${u.sales_count} vendas — ${rev}`;
        });
        sendTelegramReply(msg);
      }
      break;
    }

    case '/erros': {
      const { rows } = await pool.query(`
        SELECT method, path, status_code, duration_ms, error_message,
               ts AT TIME ZONE 'America/Sao_Paulo' AS ts
        FROM request_logs
        WHERE status_code >= 500
        ORDER BY ts DESC
        LIMIT 10
      `);
      if (rows.length === 0) {
        sendTelegramReply('✅ Nenhum erro 500 registrado.');
      } else {
        let msg = `🚨 Ultimos ${rows.length} erros:\n`;
        rows.forEach((r: { method: string; path: string; status_code: number; duration_ms: number; error_message: string | null; ts: Date }) => {
          const time = new Date(r.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          msg += `\n${r.method} ${r.path} — ${r.status_code} — ${r.duration_ms}ms`;
          if (r.error_message) msg += `\nErro: ${r.error_message}`;
          msg += `\n🕐 ${time}`;
        });
        sendTelegramReply(msg);
      }
      break;
    }

    case '/lentas': {
      const { rows } = await pool.query(`
        SELECT method, path, status_code, duration_ms,
               ts AT TIME ZONE 'America/Sao_Paulo' AS ts
        FROM request_logs
        WHERE duration_ms > 2000
        ORDER BY ts DESC
        LIMIT 10
      `);
      if (rows.length === 0) {
        sendTelegramReply('✅ Nenhuma rota lenta (>2s) registrada.');
      } else {
        let msg = `🐢 Ultimas ${rows.length} rotas lentas:\n`;
        rows.forEach((r: { method: string; path: string; status_code: number; duration_ms: number; ts: Date }) => {
          const time = new Date(r.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          msg += `\n${r.method} ${r.path} — ${r.status_code} — ${r.duration_ms}ms\n🕐 ${time}`;
        });
        sendTelegramReply(msg);
      }
      break;
    }

    case '/logs': {
      const { rows } = await pool.query(`
        SELECT method, path, status_code, duration_ms,
               ts AT TIME ZONE 'America/Sao_Paulo' AS ts
        FROM request_logs
        ORDER BY ts DESC
        LIMIT 20
      `);
      if (rows.length === 0) {
        sendTelegramReply('📭 Nenhum log registrado.');
      } else {
        let msg = `📋 Ultimos ${rows.length} logs:\n`;
        rows.forEach((r: { method: string; path: string; status_code: number; duration_ms: number; ts: Date }) => {
          const time = new Date(r.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const icon = r.status_code >= 500 ? '🔴' : r.status_code >= 400 ? '🟡' : '🟢';
          msg += `\n${icon} ${r.method} ${r.path} — ${r.status_code} — ${r.duration_ms}ms (${time})`;
        });
        sendTelegramReply(msg);
      }
      break;
    }

    case '/atualizar': {
      sendTelegramReply('📧 Enviando email de atualizacao para todos os usuarios...');
      const result = await sendBulkUpdateEmail();
      sendTelegramReply(`✅ Email de atualizacao enviado!\n\n📬 Enviados: ${result.sent}\n❌ Falhas: ${result.failed}`);
      break;
    }

    case '/downloads': {
      // Database stats (cadastros)
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')::int AS today,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')::int AS this_week,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')::int AS this_month
        FROM users
      `);
      const { total, today, this_week, this_month } = rows[0];

      const { rows: platformRows } = await pool.query(`
        SELECT pt.platform, COUNT(DISTINCT pt.user_id)::int AS count
        FROM push_tokens pt GROUP BY pt.platform
      `);
      let iosCount = 0;
      let androidCount = 0;
      platformRows.forEach((p: { platform: string; count: number }) => {
        if (p.platform === 'ios') iosCount = p.count;
        if (p.platform === 'android') androidCount = p.count;
      });

      let msg =
        `📲 Cadastros no app\n\n` +
        `👥 Total: ${total}\n` +
        `🆕 Hoje: ${today}\n` +
        `📅 Esta semana: ${this_week}\n` +
        `📆 Este mes: ${this_month}`;

      if (iosCount > 0 || androidCount > 0) {
        msg += `\n\n📱 Por plataforma:\n🍎 iOS: ${iosCount}\n🤖 Android: ${androidCount}`;
      }

      // App Store Connect downloads (real Apple data)
      const hasASC = process.env.ASC_ISSUER_ID && process.env.ASC_KEY_ID && process.env.ASC_PRIVATE_KEY && process.env.ASC_VENDOR_NUMBER;
      if (hasASC) {
        try {
          sendTelegramReply(msg + '\n\n⏳ Buscando dados da App Store...');
          const stats = await fetchDownloadsLastDays(7);
          if (stats.length > 0) {
            const totalDownloads = stats.reduce((sum, s) => sum + s.totalUnits, 0);
            const maxUnits = Math.max(...stats.map(s => s.totalUnits), 1);

            let ascMsg = `\n🍎 Downloads App Store (${stats.length} dias)\n\n` +
              `📥 Total: ${totalDownloads} downloads\n\n📈 Por dia:`;

            stats.forEach(s => {
              const dayStr = s.date.slice(5).replace('-', '/');
              const bar = '█'.repeat(Math.round((s.totalUnits / maxUnits) * 8));
              ascMsg += `\n${dayStr} ${bar} ${s.totalUnits}`;
            });

            // Top countries
            const allCountries: Record<string, number> = {};
            stats.forEach(s => {
              for (const [country, units] of Object.entries(s.byCountry)) {
                allCountries[country] = (allCountries[country] || 0) + units;
              }
            });
            const topCountries = Object.entries(allCountries)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);
            if (topCountries.length > 0) {
              ascMsg += '\n\n🌍 Top paises:';
              topCountries.forEach(([country, units]) => {
                ascMsg += `\n  ${country}: ${units}`;
              });
            }

            ascMsg += `\n\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
            sendTelegramReply(ascMsg);
          } else {
            msg += '\n\n🍎 App Store: sem dados disponiveis (relatorios demoram ~2 dias)';
            msg += `\n\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
            sendTelegramReply(msg);
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          msg += `\n\n🍎 App Store: erro ao buscar dados\n⚠️ ${errMsg}`;
          msg += `\n\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
          sendTelegramReply(msg);
        }
      } else {
        // No ASC config — show chart from database only
        const { rows: dailyRows } = await pool.query(`
          SELECT d::date AS day, COUNT(u.id)::int AS count
          FROM generate_series(
            (NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '6 days')::date,
            (NOW() AT TIME ZONE 'America/Sao_Paulo')::date, '1 day'
          ) AS d
          LEFT JOIN users u ON u.created_at::date = d::date
          GROUP BY d::date ORDER BY d::date
        `);
        let chartMsg = '\n\n📈 Cadastros ultimos 7 dias:';
        const maxCount = Math.max(...dailyRows.map((r: { count: number }) => r.count), 1);
        dailyRows.forEach((r: { day: string; count: number }) => {
          const dayStr = new Date(r.day).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
          const bar = '█'.repeat(Math.round((r.count / maxCount) * 8));
          chartMsg += `\n${dayStr} ${bar} ${r.count}`;
        });
        msg += chartMsg;
        msg += '\n\n💡 Configure ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY e ASC_VENDOR_NUMBER para ver downloads reais da App Store.';
        msg += `\n\n🕐 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
        sendTelegramReply(msg);
      }
      break;
    }

    case '/ajuda':
      sendTelegramReply(
        '📋 Comandos disponiveis:\n\n' +
        '/relatorio — Relatorio diario (usuarios)\n' +
        '/semanal — Relatorio semanal completo\n' +
        '/meta — Progresso da meta de cadastros do dia\n' +
        '/premium — Lista usuarios premium\n' +
        '/vendashoje — Vendas do dia\n' +
        '/top — Top 10 usuarios (30 dias)\n' +
        '/downloads — Cadastros (hoje/semana/mes + plataforma)\n' +
        '/erros — Ultimos 10 erros (500)\n' +
        '/lentas — Ultimas 10 rotas lentas (>2s)\n' +
        '/logs — Ultimos 20 requests\n' +
        '/atualizar — Envia email de atualizacao para todos\n' +
        '/ajuda — Esta mensagem'
      );
      break;
  }
  } catch (err) {
    console.error('[Telegram] Erro ao processar comando:', err);
    sendTelegramReply(`❌ Erro ao executar ${text}`);
  }

  res.sendStatus(200);
});

export default router;
