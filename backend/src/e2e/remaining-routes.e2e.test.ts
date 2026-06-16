import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const ok = (_req: unknown, res: express.Response) => res.json({ success: true });
const created = (_req: unknown, res: express.Response) => res.status(201).json({ success: true });

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) },
}));
jest.mock('../infrastructure/services/pushService', () => ({
  sendPushNotifications: jest.fn(),
}));
jest.mock('../infrastructure/services/telegramService', () => ({
  notifyPremiumEvent: jest.fn(),
  notifyPixRequest: jest.fn(),
}));
jest.mock('../presentation/controllers/AdminController', () => ({
  AdminController: jest.fn(() => ({
    getStats: ok,
    listUsers: ok,
    getUser: ok,
    getLogs: ok,
    getRequestLogs: ok,
    setPremium: ok,
    setSignupPlatform: ok,
    grantTrial: ok,
    getUserData: ok,
    resetUserPassword: ok,
    toggleUserActive: ok,
    getPremiumHistory: ok,
    updatePremiumEventAmount: ok,
    sendUpdateEmail: ok,
    getDailyRegistrationGoal: ok,
    setDailyRegistrationGoal: ok,
  })),
}));
jest.mock('../presentation/controllers/PixController', () => ({
  PixController: jest.fn(() => ({
    createRequest: created,
    getStatus: ok,
    listRequests: ok,
    approveRequest: ok,
    rejectRequest: ok,
  })),
}));
jest.mock('../presentation/controllers/PremiumController', () => ({
  PremiumController: jest.fn(() => ({
    revenueCatWebhook: ok,
    syncPremium: ok,
    requestTrial: ok,
    setPremiumManually: ok,
  })),
}));
jest.mock('../presentation/controllers/StripeController', () => ({
  StripeController: jest.fn(() => ({
    createCheckout: ok,
    hasPaymentMethod: ok,
    webhook: ok,
    success: ok,
    cancel: ok,
  })),
}));

import adminRoutes from '../presentation/routes/adminRoutes';
import pixRoutes from '../presentation/routes/pixRoutes';
import premiumRoutes from '../presentation/routes/premiumRoutes';
import stripeRoutes from '../presentation/routes/stripeRoutes';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type RouteCase = readonly [Method, string];

const JWT_SECRET = 'remaining-routes-secret';
const token = jwt.sign({ userId: '11111111-1111-1111-1111-111111111111' }, JWT_SECRET);

const adminRoutesCases: RouteCase[] = [
  ['get', '/admin/stats'],
  ['get', '/admin/users'],
  ['get', '/admin/users/id'],
  ['get', '/admin/logs'],
  ['get', '/admin/request-logs'],
  ['post', '/admin/users/id/premium'],
  ['patch', '/admin/users/id/signup-platform'],
  ['post', '/admin/users/id/grant-trial'],
  ['get', '/admin/users/id/data'],
  ['post', '/admin/users/id/reset-password'],
  ['post', '/admin/users/id/toggle-active'],
  ['get', '/admin/users/id/premium-history'],
  ['patch', '/admin/premium-events/id'],
  ['post', '/admin/send-update-email'],
  ['get', '/admin/settings/daily-registration-goal'],
  ['put', '/admin/settings/daily-registration-goal'],
];

const userCases: RouteCase[] = [
  ['post', '/pix/request'],
  ['get', '/pix/status'],
  ['post', '/premium/sync'],
  ['post', '/premium/trial'],
  ['post', '/stripe/create-checkout'],
  ['get', '/stripe/has-payment-method'],
];

const protectedAdminCases: RouteCase[] = [
  ['get', '/admin/pix-requests'],
  ['post', '/admin/pix-requests/id/approve'],
  ['post', '/admin/pix-requests/id/reject'],
  ['post', '/admin/users/id/premium-manual'],
];

const publicCases: RouteCase[] = [
  ['post', '/webhooks/revenuecat'],
  ['post', '/stripe/webhook'],
  ['get', '/stripe/success'],
  ['get', '/stripe/cancel'],
];

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use('/', pixRoutes);
  app.use('/', premiumRoutes);
  app.use('/', stripeRoutes);
  return app;
}

function call(method: Method, path: string) {
  return request(createApp())[method](path).send({});
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.DOCEPRECO_ADMIN_SECRET = 'remaining-admin';
});

describe('Sucesso HTTP das rotas restantes', () => {
  it.each(adminRoutesCases)('%s %s delega ao controller administrativo', async (method, path) => {
    const res = await call(method, path).set('x-admin-secret', 'remaining-admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it.each(userCases)('%s %s delega com JWT válido', async (method, path) => {
    const res = await call(method, path).set('Authorization', `Bearer ${token}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it.each(protectedAdminCases)('%s %s delega com segredo administrativo', async (method, path) => {
    const actualPath = path === '/admin/users/id/premium-manual'
      ? '/admin/users/id/premium'
      : path;
    const res = await call(method, actualPath).set('x-admin-secret', 'remaining-admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it.each(publicCases)('%s %s responde sem autenticação de usuário', async (method, path) => {
    const res = await call(method, path);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
