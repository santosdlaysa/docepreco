import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { sendDailyUserReport } from './infrastructure/services/telegramService';
import { connectDatabase } from './infrastructure/database/connection';
import recipeRoutes from './presentation/routes/recipeRoutes';
import ingredientRoutes from './presentation/routes/ingredientRoutes';
import saleRoutes from './presentation/routes/saleRoutes';
import authRoutes from './presentation/routes/authRoutes';
import statsRoutes from './presentation/routes/statsRoutes';
import premiumRoutes from './presentation/routes/premiumRoutes';
import adminRoutes from './presentation/routes/adminRoutes';
import goalRoutes from './presentation/routes/goalRoutes';
import seasonRoutes from './presentation/routes/seasonRoutes';
import priceHistoryRoutes from './presentation/routes/priceHistoryRoutes';
import { authMiddleware } from './presentation/middleware/authMiddleware';
import telegramRoutes from './presentation/routes/telegramRoutes';
import bannerRoutes from './presentation/routes/bannerRoutes';
import pushTokenRoutes from './presentation/routes/pushTokenRoutes';
import notificationRoutes from './presentation/routes/notificationRoutes';
import tipRoutes from './presentation/routes/tipRoutes';
import notificationTemplateRoutes from './presentation/routes/notificationTemplateRoutes';
import { pool } from './infrastructure/database/connection';
import { PostgresNotificationRepository } from './infrastructure/repositories/PostgresNotificationRepository';
import { PostgresPushTokenRepository } from './infrastructure/repositories/PostgresPushTokenRepository';
import { sendPushNotifications } from './infrastructure/services/pushService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? null;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.originalUrl.split('?')[0];
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    pool.query(
      `INSERT INTO request_logs (method, path, status_code, duration_ms, ip) VALUES ($1, $2, $3, $4, $5)`,
      [req.method, path, res.statusCode, duration, ip]
    ).catch(() => {});
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', authMiddleware, recipeRoutes);
app.use('/api/ingredients', authMiddleware, ingredientRoutes);
app.use('/api/sales', authMiddleware, saleRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/seasons', authMiddleware, seasonRoutes);
app.use('/api/ingredients/:ingredientId/price-history', authMiddleware, priceHistoryRoutes);
app.use('/api', premiumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/push-tokens', authMiddleware, pushTokenRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/notification-templates', notificationTemplateRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // Relatório diário às 8h (horário de Brasília)
    cron.schedule('0 8 * * *', () => sendDailyUserReport(), { timezone: 'America/Sao_Paulo' });

    // Cron: envia notificações agendadas a cada minuto
    const notifRepo = new PostgresNotificationRepository();
    const tokenRepo = new PostgresPushTokenRepository();
    cron.schedule('* * * * *', async () => {
      try {
        const pending = await notifRepo.findPending();
        for (const notif of pending) {
          try {
            const tokens = await tokenRepo.findByTarget(notif.target);
            const tokenStrings = tokens.map(t => t.token);
            const data = notif.dataJson ? JSON.parse(notif.dataJson) : undefined;
            const count = await sendPushNotifications(tokenStrings, notif.title, notif.body, data);
            await notifRepo.markSent(notif.id, count);
            console.log(`[Cron] Notificação ${notif.id} enviada para ${count} dispositivos`);
          } catch (err) {
            await notifRepo.markFailed(notif.id);
            console.error(`[Cron] Falha ao enviar notificação ${notif.id}:`, err);
          }
        }
      } catch (err) {
        console.error('[Cron] Erro ao processar notificações:', err);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
