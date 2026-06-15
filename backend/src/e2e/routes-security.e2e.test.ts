import express from 'express';
import request from 'supertest';

const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));
jest.mock('../infrastructure/services/pushService', () => ({
  sendPushNotifications: jest.fn(),
  sendPushNotification: jest.fn(),
}));
jest.mock('../infrastructure/services/referralService', () => ({
  processReferralActivation: jest.fn(),
}));
jest.mock('../infrastructure/services/emailService', () => ({
  sendPasswordResetCode: jest.fn(),
  sendBulkUpdateEmail: jest.fn(),
}));
jest.mock('../infrastructure/services/telegramService', () => ({
  notifyNewUser: jest.fn(),
  notifyUserMilestone: jest.fn(),
  notifyPremiumEvent: jest.fn(),
  notifyPixRequest: jest.fn(),
  notifySupportMessage: jest.fn(),
}));
jest.mock('../infrastructure/services/whatsappService', () => ({
  createInstance: jest.fn(),
  getQrCode: jest.fn(),
  getInstanceStatus: jest.fn(),
  sendWhatsAppMessage: jest.fn(),
}));

import { authMiddleware } from '../presentation/middleware/authMiddleware';
import adminRoutes from '../presentation/routes/adminRoutes';
import authRoutes from '../presentation/routes/authRoutes';
import bannerRoutes from '../presentation/routes/bannerRoutes';
import cashRoutes from '../presentation/routes/cashRoutes';
import categoryRoutes from '../presentation/routes/categoryRoutes';
import changelogRoutes from '../presentation/routes/changelogRoutes';
import couponRoutes from '../presentation/routes/couponRoutes';
import expenseRoutes from '../presentation/routes/expenseRoutes';
import faqRoutes from '../presentation/routes/faqRoutes';
import featuredRecipeRoutes from '../presentation/routes/featuredRecipeRoutes';
import featureFlagRoutes from '../presentation/routes/featureFlagRoutes';
import feedbackRoutes from '../presentation/routes/feedbackRoutes';
import globalIngredientRoutes from '../presentation/routes/globalIngredientRoutes';
import goalRoutes from '../presentation/routes/goalRoutes';
import ingredientRoutes from '../presentation/routes/ingredientRoutes';
import notificationRoutes from '../presentation/routes/notificationRoutes';
import notificationTemplateRoutes from '../presentation/routes/notificationTemplateRoutes';
import onboardingRoutes from '../presentation/routes/onboardingRoutes';
import orderRoutes from '../presentation/routes/orderRoutes';
import pixRoutes from '../presentation/routes/pixRoutes';
import planConfigRoutes from '../presentation/routes/planConfigRoutes';
import premiumRoutes from '../presentation/routes/premiumRoutes';
import priceHistoryRoutes from '../presentation/routes/priceHistoryRoutes';
import pushTokenRoutes from '../presentation/routes/pushTokenRoutes';
import recipeRoutes from '../presentation/routes/recipeRoutes';
import referralRoutes from '../presentation/routes/referralRoutes';
import saleRoutes from '../presentation/routes/saleRoutes';
import seasonRoutes from '../presentation/routes/seasonRoutes';
import statsRoutes from '../presentation/routes/statsRoutes';
import stripeRoutes from '../presentation/routes/stripeRoutes';
import suggestionRoutes from '../presentation/routes/suggestionRoutes';
import supportRoutes from '../presentation/routes/supportRoutes';
import telegramAlertRoutes from '../presentation/routes/telegramAlertRoutes';
import tipRoutes from '../presentation/routes/tipRoutes';
import whatsappRoutes from '../presentation/routes/whatsappRoutes';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type ProtectedRoute = readonly [Method, string];

const USER_ROUTES: ProtectedRoute[] = [
  ['get', '/api/auth/me'],
  ['patch', '/api/auth/profile'],
  ['post', '/api/auth/change-password'],
  ['post', '/api/auth/suggestion'],
  ['delete', '/api/auth/account'],
  ['get', '/api/recipes'],
  ['get', '/api/recipes/id'],
  ['post', '/api/recipes'],
  ['put', '/api/recipes/id'],
  ['delete', '/api/recipes/id'],
  ['post', '/api/recipes/id/calculate'],
  ['get', '/api/ingredients'],
  ['get', '/api/ingredients/id'],
  ['post', '/api/ingredients'],
  ['put', '/api/ingredients/id'],
  ['delete', '/api/ingredients/id'],
  ['get', '/api/ingredients/id/price-history'],
  ['post', '/api/ingredients/id/price-history'],
  ['get', '/api/sales'],
  ['post', '/api/sales'],
  ['delete', '/api/sales/id'],
  ['get', '/api/cash/current'],
  ['post', '/api/cash/open'],
  ['post', '/api/cash/close'],
  ['post', '/api/cash/movements'],
  ['get', '/api/cash/sessions'],
  ['get', '/api/stats'],
  ['get', '/api/goals/6/2026'],
  ['put', '/api/goals/6/2026'],
  ['get', '/api/seasons'],
  ['get', '/api/seasons/active'],
  ['post', '/api/seasons'],
  ['put', '/api/seasons/id'],
  ['delete', '/api/seasons/id'],
  ['get', '/api/orders'],
  ['get', '/api/orders/id'],
  ['post', '/api/orders'],
  ['put', '/api/orders/id'],
  ['delete', '/api/orders/id'],
  ['post', '/api/push-tokens'],
  ['delete', '/api/push-tokens'],
  ['post', '/api/premium/sync'],
  ['post', '/api/premium/trial'],
  ['post', '/api/pix/request'],
  ['get', '/api/pix/status'],
  ['get', '/api/referrals/me'],
  ['get', '/api/referrals/progress'],
  ['post', '/api/stripe/create-checkout'],
  ['get', '/api/stripe/has-payment-method'],
  ['get', '/api/expenses/summary'],
  ['get', '/api/expenses'],
  ['post', '/api/expenses'],
  ['put', '/api/expenses/id'],
  ['delete', '/api/expenses/id'],
  ['post', '/api/admin/feedbacks'],
  ['post', '/api/admin/suggestions'],
  ['get', '/api/support/messages'],
  ['post', '/api/support/messages'],
  ['get', '/api/support/unread'],
  ['get', '/api/support/typing'],
];

const ADMIN_ROUTES: ProtectedRoute[] = [
  ['get', '/api/admin/stats'],
  ['get', '/api/admin/users'],
  ['get', '/api/admin/users/id'],
  ['get', '/api/admin/logs'],
  ['get', '/api/admin/request-logs'],
  ['post', '/api/admin/users/id/premium'],
  ['patch', '/api/admin/users/id/signup-platform'],
  ['post', '/api/admin/users/id/grant-trial'],
  ['get', '/api/admin/users/id/data'],
  ['post', '/api/admin/users/id/reset-password'],
  ['post', '/api/admin/users/id/toggle-active'],
  ['get', '/api/admin/users/id/premium-history'],
  ['patch', '/api/admin/premium-events/id'],
  ['post', '/api/admin/send-update-email'],
  ['get', '/api/admin/settings/daily-registration-goal'],
  ['put', '/api/admin/settings/daily-registration-goal'],
  ['put', '/api/admin/settings/plans'],
  ['get', '/api/banners'],
  ['post', '/api/banners'],
  ['put', '/api/banners/id'],
  ['delete', '/api/banners/id'],
  ['get', '/api/notifications'],
  ['post', '/api/notifications'],
  ['post', '/api/notifications/id/send'],
  ['delete', '/api/notifications/id'],
  ['get', '/api/notification-templates'],
  ['put', '/api/notification-templates/id'],
  ['post', '/api/notification-templates/id/send'],
  ['get', '/api/admin/global-ingredients'],
  ['post', '/api/admin/global-ingredients'],
  ['put', '/api/admin/global-ingredients/id'],
  ['delete', '/api/admin/global-ingredients/id'],
  ['get', '/api/admin/featured-recipes'],
  ['post', '/api/admin/featured-recipes'],
  ['put', '/api/admin/featured-recipes/id'],
  ['delete', '/api/admin/featured-recipes/id'],
  ['get', '/api/admin/feature-flags'],
  ['post', '/api/admin/feature-flags'],
  ['put', '/api/admin/feature-flags/id'],
  ['delete', '/api/admin/feature-flags/id'],
  ['get', '/api/admin/faq'],
  ['post', '/api/admin/faq'],
  ['put', '/api/admin/faq/id'],
  ['delete', '/api/admin/faq/id'],
  ['get', '/api/admin/coupons'],
  ['post', '/api/admin/coupons'],
  ['put', '/api/admin/coupons/id'],
  ['delete', '/api/admin/coupons/id'],
  ['get', '/api/admin/categories'],
  ['post', '/api/admin/categories'],
  ['put', '/api/admin/categories/id'],
  ['delete', '/api/admin/categories/id'],
  ['get', '/api/admin/feedbacks'],
  ['put', '/api/admin/feedbacks/id'],
  ['post', '/api/admin/feedbacks/id/reply'],
  ['get', '/api/admin/suggestions'],
  ['put', '/api/admin/suggestions/id'],
  ['post', '/api/admin/suggestions/id/note'],
  ['delete', '/api/admin/suggestions/id'],
  ['get', '/api/admin/changelog'],
  ['post', '/api/admin/changelog'],
  ['put', '/api/admin/changelog/id'],
  ['delete', '/api/admin/changelog/id'],
  ['get', '/api/admin/onboarding'],
  ['post', '/api/admin/onboarding'],
  ['put', '/api/admin/onboarding/id'],
  ['delete', '/api/admin/onboarding/id'],
  ['get', '/api/admin/telegram-alerts'],
  ['post', '/api/admin/telegram-alerts'],
  ['put', '/api/admin/telegram-alerts/id'],
  ['delete', '/api/admin/telegram-alerts/id'],
  ['get', '/api/tips'],
  ['post', '/api/tips'],
  ['put', '/api/tips/id'],
  ['delete', '/api/tips/id'],
  ['get', '/api/admin/pix-requests'],
  ['post', '/api/admin/pix-requests/id/approve'],
  ['post', '/api/admin/pix-requests/id/reject'],
  ['get', '/api/admin/referrals'],
  ['get', '/api/admin/referrals/stats'],
  ['post', '/api/admin/referrals/id/invalidate'],
  ['post', '/api/admin/referrals/id/force-valid'],
  ['get', '/api/support/admin/conversations'],
  ['get', '/api/support/admin/conversations/user'],
  ['post', '/api/support/admin/conversations/user'],
  ['post', '/api/support/admin/conversations/user/typing'],
  ['get', '/api/support/admin/unread'],
  ['post', '/api/admin/whatsapp/instance'],
  ['get', '/api/admin/whatsapp/qrcode'],
  ['get', '/api/admin/whatsapp/status'],
  ['post', '/api/admin/whatsapp/send'],
];

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/recipes', authMiddleware, recipeRoutes);
  app.use('/api/ingredients', authMiddleware, ingredientRoutes);
  app.use('/api/sales', authMiddleware, saleRoutes);
  app.use('/api/cash', authMiddleware, cashRoutes);
  app.use('/api/stats', authMiddleware, statsRoutes);
  app.use('/api/goals', authMiddleware, goalRoutes);
  app.use('/api/seasons', authMiddleware, seasonRoutes);
  app.use('/api/orders', authMiddleware, orderRoutes);
  app.use('/api/ingredients/:ingredientId/price-history', authMiddleware, priceHistoryRoutes);
  app.use('/api', premiumRoutes);
  app.use('/api', pixRoutes);
  app.use('/api', referralRoutes);
  app.use('/api', stripeRoutes);
  app.use('/api', expenseRoutes);
  app.use('/api/admin/settings/plans', planConfigRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/whatsapp', whatsappRoutes);
  app.use('/api/banners', bannerRoutes);
  app.use('/api/push-tokens', authMiddleware, pushTokenRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/tips', tipRoutes);
  app.use('/api/notification-templates', notificationTemplateRoutes);
  app.use('/api/admin/global-ingredients', globalIngredientRoutes);
  app.use('/api/admin/featured-recipes', featuredRecipeRoutes);
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
  return app;
}

function call(app: express.Express, method: Method, path: string) {
  return request(app)[method](path).send({});
}

describe('Proteção E2E de todas as rotas privadas', () => {
  const app = createApp();

  beforeAll(() => {
    process.env.JWT_SECRET = 'routes-security-secret';
    process.env.DOCEPRECO_ADMIN_SECRET = 'admin-secret';
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  it.each(USER_ROUTES)('%s %s exige JWT', async (method, path) => {
    const res = await call(app, method, path);
    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('%s %s exige credencial administrativa', async (method, path) => {
    const res = await call(app, method, path);
    expect(res.status).toBe(401);
  });

  it('rejeita segredo administrativo incorreto', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('x-admin-secret', 'segredo-incorreto');

    expect(res.status).toBe(401);
  });
});
