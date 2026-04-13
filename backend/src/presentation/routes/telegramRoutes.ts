import { Router, Request, Response } from 'express';
import { sendDailyUserReport, sendWeeklyReport } from '../../infrastructure/services/telegramService';
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

    case '/ajuda':
      sendTelegramReply(
        '📋 Comandos disponiveis:\n\n' +
        '/relatorio — Relatorio diario (usuarios)\n' +
        '/semanal — Relatorio semanal completo\n' +
        '/premium — Lista usuarios premium\n' +
        '/vendashoje — Vendas do dia\n' +
        '/top — Top 10 usuarios (30 dias)\n' +
        '/ajuda — Esta mensagem'
      );
      break;
  }

  res.sendStatus(200);
});

export default router;
