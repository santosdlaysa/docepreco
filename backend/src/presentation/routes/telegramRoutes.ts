import { Router, Request, Response } from 'express';
import { sendDailyUserReport, sendWeeklyReport } from '../../infrastructure/services/telegramService';
import { sendBulkUpdateEmail } from '../../infrastructure/services/emailService';
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

    case '/ajuda':
      sendTelegramReply(
        '📋 Comandos disponiveis:\n\n' +
        '/relatorio — Relatorio diario (usuarios)\n' +
        '/semanal — Relatorio semanal completo\n' +
        '/premium — Lista usuarios premium\n' +
        '/vendashoje — Vendas do dia\n' +
        '/top — Top 10 usuarios (30 dias)\n' +
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
