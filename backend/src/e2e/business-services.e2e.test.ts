import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const poolQuery = jest.fn();
const notificationRepo = {
  findAll: jest.fn(), create: jest.fn(), findById: jest.fn(),
  markSent: jest.fn(), markFailed: jest.fn(), delete: jest.fn(),
};
const templateRepo = { findAll: jest.fn(), findActive: jest.fn(), update: jest.fn() };
const tokenRepo = { findByTarget: jest.fn() };
const referralRepo = {
  getProgress: jest.fn(), getHistory: jest.fn(), listAll: jest.fn(),
  stats: jest.fn(), invalidate: jest.fn(), forceValid: jest.fn(),
};
const sendPush = jest.fn();

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
jest.mock('../infrastructure/repositories/PostgresNotificationRepository', () => ({
  PostgresNotificationRepository: jest.fn(() => notificationRepo),
}));
jest.mock('../infrastructure/repositories/PostgresNotificationTemplateRepository', () => ({
  PostgresNotificationTemplateRepository: jest.fn(() => templateRepo),
}));
jest.mock('../infrastructure/repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn(() => tokenRepo),
}));
jest.mock('../infrastructure/repositories/PostgresReferralRepository', () => ({
  PostgresReferralRepository: jest.fn(() => referralRepo),
}));
jest.mock('../infrastructure/services/pushService', () => ({
  sendPushNotifications: (...args: unknown[]) => sendPush(...args),
}));
jest.mock('../infrastructure/services/referralService', () => ({
  processManualValidation: jest.fn().mockResolvedValue(undefined),
}));

import { authMiddleware } from '../presentation/middleware/authMiddleware';
import cashRoutes from '../presentation/routes/cashRoutes';
import notificationRoutes from '../presentation/routes/notificationRoutes';
import notificationTemplateRoutes from '../presentation/routes/notificationTemplateRoutes';
import planConfigRoutes from '../presentation/routes/planConfigRoutes';
import referralRoutes from '../presentation/routes/referralRoutes';

const JWT_SECRET = 'business-services-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/cash', authMiddleware, cashRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/templates', notificationTemplateRoutes);
  app.use('/plans', planConfigRoutes);
  app.use('/', referralRoutes);
  return app;
}

const user = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
const admin = (req: request.Test) => req.set('x-admin-secret', 'business-admin');

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.DOCEPRECO_ADMIN_SECRET = 'business-admin';
});

beforeEach(() => {
  for (const repo of [notificationRepo, templateRepo, tokenRepo, referralRepo]) {
    for (const fn of Object.values(repo)) fn.mockReset();
  }
  sendPush.mockReset();
  poolQuery.mockReset();
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

describe('Caixa', () => {
  const session = {
    id: 'cash-1', status: 'open', opened_at: new Date(), closed_at: null,
    opening_amount: '50.00', closing_counted: null, notes: null,
  };

  function cashQueries(open: boolean) {
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (sql.includes("status = 'open'")) return Promise.resolve({ rows: open ? [session] : [] });
      if (sql.includes('INSERT INTO cash_sessions')) return Promise.resolve({ rows: [session] });
      if (sql.includes('UPDATE cash_sessions')) return Promise.resolve({ rows: [{ ...session, status: 'closed' }] });
      if (sql.includes('FROM sales s')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM cash_movements')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO cash_movements')) return Promise.resolve({ rows: [], rowCount: 1 });
      if (sql.includes('SELECT * FROM cash_sessions')) return Promise.resolve({ rows: [session] });
      return Promise.resolve({ rows: [] });
    });
  }

  it('consulta caixa atual aberto e vazio', async () => {
    cashQueries(true);
    const res = await user(request(createApp()).get('/cash/current'));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'cash-1', openingAmount: 50, expectedCash: 50 });

    cashQueries(false);
    expect((await user(request(createApp()).get('/cash/current'))).body.data).toBeNull();
  });

  it('abre, fecha e lista sessões', async () => {
    cashQueries(false);
    expect((await user(request(createApp()).post('/cash/open')).send({ openingAmount: 50 })).status).toBe(201);
    cashQueries(true);
    expect((await user(request(createApp()).post('/cash/close')).send({ countedAmount: 50 })).status).toBe(200);
    cashQueries(true);
    expect((await user(request(createApp()).get('/cash/sessions'))).status).toBe(200);
  });

  it('rejeita abertura duplicada, fechamento sem caixa e movimento inválido', async () => {
    cashQueries(true);
    expect((await user(request(createApp()).post('/cash/open'))).status).toBe(400);
    cashQueries(false);
    expect((await user(request(createApp()).post('/cash/close'))).status).toBe(400);
    expect((await user(request(createApp()).post('/cash/movements')).send({ type: 'x', amount: 10 })).status).toBe(400);
    expect((await user(request(createApp()).post('/cash/movements')).send({ type: 'sangria', amount: 0 })).status).toBe(400);
  });

  it('adiciona movimento ao caixa aberto', async () => {
    cashQueries(true);
    expect((await user(request(createApp()).post('/cash/movements')).send({
      type: 'sangria', amount: 10, reason: 'Retirada',
    })).status).toBe(201);
  });
});

describe('Notificações', () => {
  it('lista e cria notificação agendada', async () => {
    notificationRepo.findAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/notifications'))).status).toBe(200);
    notificationRepo.create.mockResolvedValue({ id: 'n1', scheduledAt: '2026-06-20', target: 'all' });
    expect((await admin(request(createApp()).post('/notifications')).send({
      title: 'Aviso', body: 'Mensagem', scheduledAt: '2026-06-20',
    })).status).toBe(201);
    expect((await admin(request(createApp()).post('/notifications')).send({ title: 'Aviso' })).status).toBe(400);
  });

  it('envia imediatamente, reenvia pendente e exclui', async () => {
    notificationRepo.create.mockResolvedValue({ id: 'n1', target: 'all', title: 'A', body: 'B' });
    tokenRepo.findByTarget.mockResolvedValue([{ token: 'push-1' }]);
    sendPush.mockResolvedValue(1);
    notificationRepo.findById.mockResolvedValue({ id: 'n1', status: 'sent' });
    expect((await admin(request(createApp()).post('/notifications')).send({ title: 'A', body: 'B' })).status).toBe(201);

    notificationRepo.findById
      .mockResolvedValueOnce({ id: 'n2', status: 'pending', target: 'all', title: 'A', body: 'B' })
      .mockResolvedValueOnce({ id: 'n2', status: 'sent' });
    expect((await admin(request(createApp()).post('/notifications/n2/send'))).status).toBe(200);

    notificationRepo.delete.mockResolvedValue(true);
    expect((await admin(request(createApp()).delete('/notifications/n2'))).status).toBe(200);
  });

  it('rejeita notificação inexistente ou já enviada', async () => {
    notificationRepo.findById.mockResolvedValueOnce(null);
    expect((await admin(request(createApp()).post('/notifications/missing/send'))).status).toBe(404);
    notificationRepo.findById.mockResolvedValueOnce({ id: 'n1', status: 'sent' });
    expect((await admin(request(createApp()).post('/notifications/n1/send'))).status).toBe(400);
  });
});

describe('Templates de notificação', () => {
  it('lista ativos/admin e atualiza', async () => {
    templateRepo.findActive.mockResolvedValue([]);
    expect((await request(createApp()).get('/templates/active')).status).toBe(200);
    templateRepo.findAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/templates'))).status).toBe(200);
    templateRepo.update.mockResolvedValue({ id: 't1' });
    expect((await admin(request(createApp()).put('/templates/t1')).send({ title: 'Novo' })).status).toBe(200);
  });

  it('envia template e retorna 404 quando não existe', async () => {
    templateRepo.findAll.mockResolvedValueOnce([]);
    expect((await admin(request(createApp()).post('/templates/missing/send'))).status).toBe(404);

    templateRepo.findAll.mockResolvedValueOnce([{ id: 't1', title: 'A', body: 'B' }]);
    notificationRepo.create.mockResolvedValue({ id: 'n1' });
    tokenRepo.findByTarget.mockResolvedValue([]);
    sendPush.mockResolvedValue(0);
    notificationRepo.findById.mockResolvedValue({ id: 'n1', status: 'sent' });
    expect((await admin(request(createApp()).post('/templates/t1/send')).send({ target: 'all' })).status).toBe(200);
  });
});

describe('Configuração de planos', () => {
  it('retorna defaults e atualiza configurações', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    const get = await request(createApp()).get('/plans');
    expect(get.status).toBe(200);
    expect(get.body.data.freeRecipeLimit).toBe(3);

    const updated = await admin(request(createApp()).put('/plans')).send({
      freeRecipeLimit: 5, premiumPrice: 19.9,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.freeRecipeLimit).toBe(5);
    expect(poolQuery).toHaveBeenCalledTimes(14);
  });

  it('retorna 500 quando leitura falha', async () => {
    poolQuery.mockRejectedValue(new Error('db down'));
    expect((await request(createApp()).get('/plans')).status).toBe(500);
  });
});

describe('Indicações', () => {
  it('retorna progresso e histórico do usuário', async () => {
    referralRepo.getProgress.mockResolvedValue({ code: 'ABC' });
    referralRepo.getHistory.mockResolvedValue([]);
    expect((await user(request(createApp()).get('/referrals/me'))).status).toBe(200);
    expect((await user(request(createApp()).get('/referrals/progress'))).status).toBe(200);
  });

  it('admin lista, consulta estatísticas, invalida e força validação', async () => {
    referralRepo.listAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/admin/referrals'))).status).toBe(200);
    referralRepo.stats.mockResolvedValue({ total: 0 });
    expect((await admin(request(createApp()).get('/admin/referrals/stats'))).status).toBe(200);
    referralRepo.invalidate.mockResolvedValue(true);
    expect((await admin(request(createApp()).post('/admin/referrals/r1/invalidate'))).status).toBe(200);
    referralRepo.forceValid.mockResolvedValue('user-1');
    expect((await admin(request(createApp()).post('/admin/referrals/r1/force-valid'))).status).toBe(200);
  });

  it('rejeita indicação que não pode ser processada', async () => {
    referralRepo.invalidate.mockResolvedValue(false);
    expect((await admin(request(createApp()).post('/admin/referrals/r1/invalidate'))).status).toBe(400);
    referralRepo.forceValid.mockResolvedValue(null);
    expect((await admin(request(createApp()).post('/admin/referrals/r1/force-valid'))).status).toBe(400);
  });
});
