import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { sendDailyUserReport, sendWeeklyReport, sendErrorAlert, sendSlowApiAlert, sendDailyGoalProgress } from './infrastructure/services/telegramService';
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
import publicRoutes from './presentation/routes/publicRoutes';
import globalIngredientRoutes from './presentation/routes/globalIngredientRoutes';
import featuredRecipeRoutes from './presentation/routes/featuredRecipeRoutes';
import planConfigRoutes from './presentation/routes/planConfigRoutes';
import featureFlagRoutes from './presentation/routes/featureFlagRoutes';
import faqRoutes from './presentation/routes/faqRoutes';
import couponRoutes from './presentation/routes/couponRoutes';
import categoryRoutes from './presentation/routes/categoryRoutes';
import feedbackRoutes from './presentation/routes/feedbackRoutes';
import suggestionRoutes from './presentation/routes/suggestionRoutes';
import changelogRoutes from './presentation/routes/changelogRoutes';
import onboardingRoutes from './presentation/routes/onboardingRoutes';
import telegramAlertRoutes from './presentation/routes/telegramAlertRoutes';
import supportRoutes from './presentation/routes/supportRoutes';
import { pool } from './infrastructure/database/connection';
import { runMigrations } from './infrastructure/database/migrate';
import { PostgresTelegramAlertRepository } from './infrastructure/repositories/PostgresTelegramAlertRepository';
import { PostgresNotificationRepository } from './infrastructure/repositories/PostgresNotificationRepository';
import { PostgresPushTokenRepository } from './infrastructure/repositories/PostgresPushTokenRepository';
import { sendPushNotifications } from './infrastructure/services/pushService';
import { checkManualRenewals } from './infrastructure/services/renewalNotificationService';
import { setupSwagger } from './swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? null;

  // Intercepta res.json para capturar a mensagem de erro
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 400 && body && !res.locals.errorMessage) {
      res.locals.errorMessage = body.error || body.message || undefined;
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.originalUrl.split('?')[0];
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    const errorMsg = res.locals.errorMessage || null;
    // Capture email from login/register attempts
    const isAuthRoute = path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/auth/forgot-password';
    const bodyEmail = isAuthRoute && req.body?.email ? String(req.body.email).toLowerCase() : null;
    pool.query(
      `INSERT INTO request_logs (method, path, status_code, duration_ms, ip, error_message, body_email) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.method, path, res.statusCode, duration, ip, errorMsg, bodyEmail]
    ).catch(() => {});

    if (res.statusCode >= 500) {
      sendErrorAlert(req.method, path, res.statusCode, duration, res.locals.errorMessage);
    } else if (duration > 2000) {
      sendSlowApiAlert(req.method, path, duration);
    }
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
app.use('/api/public', publicRoutes);
app.use('/api/admin/global-ingredients', globalIngredientRoutes);
app.use('/api/admin/featured-recipes', featuredRecipeRoutes);
app.use('/api/admin/settings/plans', planConfigRoutes);
app.use('/api/admin/feature-flags', featureFlagRoutes);
app.use('/api/admin/faq', faqRoutes);
app.use('/api/admin/coupons', couponRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/feedbacks', feedbackRoutes);
app.use('/api/admin/suggestions', suggestionRoutes);
app.use('/api/admin/changelog', changelogRoutes);
app.use('/api/admin/onboarding', onboardingRoutes);
app.use('/api/admin/telegram-alerts', telegramAlertRoutes);
app.use('/api/support', supportRoutes);

setupSwagger(app);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    await connectDatabase();
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // Telegram reports — lê crons do banco
    const telegramAlertRepo = new PostgresTelegramAlertRepository();
    const cronHandlers: Record<string, () => void> = {
      daily_report: () => sendDailyUserReport(),
      weekly_report: () => sendWeeklyReport(),
      goal_progress: () => sendDailyGoalProgress({ silentIfMet: true }),
    };
    try {
      const schedules = await telegramAlertRepo.getSchedules();
      for (const { key, scheduleCron } of schedules) {
        const handler = cronHandlers[key];
        if (handler && cron.validate(scheduleCron)) {
          cron.schedule(scheduleCron, handler, { timezone: 'America/Sao_Paulo' });
          console.log(`[Cron] Telegram "${key}" agendado: ${scheduleCron}`);
        }
      }
    } catch {
      // Fallback hardcoded caso o banco não esteja pronto
      console.log('[Cron] Usando horários padrão para Telegram');
      cron.schedule('0 8 * * *', () => sendDailyUserReport(), { timezone: 'America/Sao_Paulo' });
      cron.schedule('0 9 * * 1', () => sendWeeklyReport(), { timezone: 'America/Sao_Paulo' });
      cron.schedule('0 12,15,18,21 * * *', () => sendDailyGoalProgress({ silentIfMet: true }), { timezone: 'America/Sao_Paulo' });
    }

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
    // Cron: notifica usuários manuais com mensalidade prestes a expirar (todo dia às 10h)
    cron.schedule('0 10 * * *', async () => {
      try {
        await checkManualRenewals();
      } catch (err) {
        console.error('[Cron] Erro ao verificar renovações manuais:', err);
      }
    }, { timezone: 'America/Sao_Paulo' });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
