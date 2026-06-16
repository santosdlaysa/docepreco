import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const poolQuery = jest.fn();
const couponRepo = { findAll: jest.fn(), findByCode: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const feedbackRepo = { findAll: jest.fn(), create: jest.fn(), updateStatus: jest.fn(), reply: jest.fn() };
const suggestionRepo = { findAll: jest.fn(), create: jest.fn(), updateStatus: jest.fn(), addNote: jest.fn(), remove: jest.fn() };
const supportRepo = {
  markAsRead: jest.fn(), findByUserId: jest.fn(), create: jest.fn(),
  getUnreadCountForUser: jest.fn(), getConversations: jest.fn(), getTotalUnreadCount: jest.fn(),
};
const pushRepo = { findByUserId: jest.fn() };
const whatsapp = {
  createInstance: jest.fn(), getQrCode: jest.fn(), getInstanceStatus: jest.fn(), sendWhatsAppMessage: jest.fn(),
};

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
jest.mock('../infrastructure/repositories/PostgresCouponRepository', () => ({
  PostgresCouponRepository: jest.fn(() => couponRepo),
}));
jest.mock('../infrastructure/repositories/PostgresFeedbackRepository', () => ({
  PostgresFeedbackRepository: jest.fn(() => feedbackRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSuggestionRepository', () => ({
  PostgresSuggestionRepository: jest.fn(() => suggestionRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSupportRepository', () => ({
  PostgresSupportRepository: jest.fn(() => supportRepo),
}));
jest.mock('../infrastructure/repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn(() => pushRepo),
}));
jest.mock('../infrastructure/services/telegramService', () => ({ notifySupportMessage: jest.fn() }));
jest.mock('../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../infrastructure/services/whatsappService', () => whatsapp);

import couponRoutes from '../presentation/routes/couponRoutes';
import feedbackRoutes from '../presentation/routes/feedbackRoutes';
import suggestionRoutes from '../presentation/routes/suggestionRoutes';
import supportRoutes from '../presentation/routes/supportRoutes';
import publicRoutes from '../presentation/routes/publicRoutes';
import whatsappRoutes from '../presentation/routes/whatsappRoutes';

const JWT_SECRET = 'engagement-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/coupons', couponRoutes);
  app.use('/feedbacks', feedbackRoutes);
  app.use('/suggestions', suggestionRoutes);
  app.use('/support', supportRoutes);
  app.use('/public', publicRoutes);
  app.use('/whatsapp', whatsappRoutes);
  return app;
}

const user = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
const admin = (req: request.Test) => req.set('x-admin-secret', 'engagement-admin');

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.DOCEPRECO_ADMIN_SECRET = 'engagement-admin';
});

beforeEach(() => {
  for (const repo of [couponRepo, feedbackRepo, suggestionRepo, supportRepo, pushRepo, whatsapp]) {
    for (const fn of Object.values(repo)) fn.mockReset();
  }
  poolQuery.mockReset();
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [] });
  });
});

describe('Cupons', () => {
  it('valida cupom ativo', async () => {
    couponRepo.findByCode.mockResolvedValue({
      isActive: true, expiresAt: null, maxUses: 0, usedCount: 0, discountPercent: 15,
    });
    const res = await request(createApp()).get('/coupons/validate/doce15');
    expect(res.status).toBe(200);
    expect(res.body.data.discountPercent).toBe(15);
    expect(couponRepo.findByCode).toHaveBeenCalledWith('DOCE15');
  });

  it('rejeita cupom inexistente, expirado e esgotado', async () => {
    couponRepo.findByCode.mockResolvedValueOnce(null);
    expect((await request(createApp()).get('/coupons/validate/x')).status).toBe(404);
    couponRepo.findByCode.mockResolvedValueOnce({
      isActive: true, expiresAt: '2020-01-01', maxUses: 0, usedCount: 0,
    });
    expect((await request(createApp()).get('/coupons/validate/x')).status).toBe(400);
    couponRepo.findByCode.mockResolvedValueOnce({
      isActive: true, expiresAt: null, maxUses: 1, usedCount: 1,
    });
    expect((await request(createApp()).get('/coupons/validate/x')).status).toBe(400);
  });

  it('executa CRUD administrativo', async () => {
    couponRepo.findAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/coupons'))).status).toBe(200);
    couponRepo.create.mockResolvedValue({ id: 'c1' });
    expect((await admin(request(createApp()).post('/coupons')).send({ code: 'X', discountPercent: 10 })).status).toBe(201);
    expect((await admin(request(createApp()).post('/coupons')).send({})).status).toBe(400);
    couponRepo.update.mockResolvedValueOnce({ id: 'c1' });
    expect((await admin(request(createApp()).put('/coupons/c1')).send({ isActive: false })).status).toBe(200);
    couponRepo.delete.mockResolvedValueOnce(false);
    expect((await admin(request(createApp()).delete('/coupons/missing'))).status).toBe(404);
  });
});

describe('Feedbacks e sugestões', () => {
  it('cria feedback e valida campos', async () => {
    feedbackRepo.create.mockResolvedValue({ id: 'f1' });
    expect((await user(request(createApp()).post('/feedbacks')).send({ message: 'Ótimo', rating: 5 })).status).toBe(201);
    expect((await user(request(createApp()).post('/feedbacks')).send({ message: 'Sem nota' })).status).toBe(400);
  });

  it('admin lista, atualiza e responde feedback', async () => {
    feedbackRepo.findAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/feedbacks'))).status).toBe(200);
    feedbackRepo.updateStatus.mockResolvedValue({ id: 'f1' });
    expect((await admin(request(createApp()).put('/feedbacks/f1')).send({ status: 'read' })).status).toBe(200);
    expect((await admin(request(createApp()).put('/feedbacks/f1')).send({ status: 'invalid' })).status).toBe(400);
    feedbackRepo.reply.mockResolvedValue({ id: 'f1' });
    expect((await admin(request(createApp()).post('/feedbacks/f1/reply')).send({ reply: 'Obrigado' })).status).toBe(200);
  });

  it('executa fluxo completo de sugestões', async () => {
    suggestionRepo.create.mockResolvedValue({ id: 's1' });
    expect((await user(request(createApp()).post('/suggestions')).send({ message: 'Nova função' })).status).toBe(201);
    expect((await user(request(createApp()).post('/suggestions')).send({})).status).toBe(400);

    suggestionRepo.findAll.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/suggestions'))).status).toBe(200);
    suggestionRepo.updateStatus.mockResolvedValue({ id: 's1' });
    expect((await admin(request(createApp()).put('/suggestions/s1')).send({ status: 'done' })).status).toBe(200);
    suggestionRepo.addNote.mockResolvedValue({ id: 's1' });
    expect((await admin(request(createApp()).post('/suggestions/s1/note')).send({ adminNote: 'Planejado' })).status).toBe(200);
    suggestionRepo.remove.mockResolvedValue(true);
    expect((await admin(request(createApp()).delete('/suggestions/s1'))).status).toBe(200);
  });
});

describe('Suporte', () => {
  it('usuário consulta, envia e acompanha mensagens', async () => {
    supportRepo.markAsRead.mockResolvedValue(undefined);
    supportRepo.findByUserId.mockResolvedValue([{ id: 'm1' }]);
    expect((await user(request(createApp()).get('/support/messages'))).status).toBe(200);

    supportRepo.create.mockResolvedValue({ id: 'm2' });
    expect((await user(request(createApp()).post('/support/messages')).send({ message: ' Ajuda ' })).status).toBe(201);
    expect((await user(request(createApp()).post('/support/messages')).send({ message: ' ' })).status).toBe(400);

    supportRepo.getUnreadCountForUser.mockResolvedValue(2);
    expect((await user(request(createApp()).get('/support/unread'))).body.data.unreadCount).toBe(2);
    expect((await user(request(createApp()).get('/support/typing'))).status).toBe(200);
  });

  it('admin gerencia conversas, resposta e digitação', async () => {
    supportRepo.getConversations.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/support/admin/conversations'))).status).toBe(200);
    supportRepo.markAsRead.mockResolvedValue(undefined);
    supportRepo.findByUserId.mockResolvedValue([]);
    expect((await admin(request(createApp()).get('/support/admin/conversations/user-1'))).status).toBe(200);
    supportRepo.create.mockResolvedValue({ id: 'm3' });
    pushRepo.findByUserId.mockResolvedValue([]);
    expect((await admin(request(createApp()).post('/support/admin/conversations/user-1')).send({ message: 'Resposta' })).status).toBe(201);
    expect((await admin(request(createApp()).post('/support/admin/conversations/user-1/typing'))).status).toBe(200);
    supportRepo.getTotalUnreadCount.mockResolvedValue(3);
    expect((await admin(request(createApp()).get('/support/admin/unread'))).body.data.unreadCount).toBe(3);
  });
});

describe('Rotas públicas e WhatsApp', () => {
  it('retorna estatísticas públicas e trata falha', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ totalUsers: 10, totalRecipes: 20 }] });
    expect((await request(createApp()).get('/public/stats')).status).toBe(200);
    poolQuery.mockRejectedValueOnce(new Error('db down'));
    expect((await request(createApp()).get('/public/stats')).status).toBe(500);
  });

  it('executa operações do WhatsApp e valida envio', async () => {
    whatsapp.createInstance.mockResolvedValue({ id: 'instance' });
    expect((await admin(request(createApp()).post('/whatsapp/instance'))).status).toBe(200);
    whatsapp.getQrCode.mockResolvedValue({ code: 'qr' });
    expect((await admin(request(createApp()).get('/whatsapp/qrcode'))).status).toBe(200);
    whatsapp.getInstanceStatus.mockResolvedValue({ connected: true });
    expect((await admin(request(createApp()).get('/whatsapp/status'))).status).toBe(200);
    whatsapp.sendWhatsAppMessage.mockResolvedValue({ sent: true });
    expect((await admin(request(createApp()).post('/whatsapp/send')).send({ phone: '5592', message: 'Oi' })).status).toBe(200);
    expect((await admin(request(createApp()).post('/whatsapp/send')).send({ phone: '5592' })).status).toBe(400);
  });

  it('retorna 500 quando serviço do WhatsApp falha', async () => {
    whatsapp.createInstance.mockRejectedValue(new Error('offline'));
    expect((await admin(request(createApp()).post('/whatsapp/instance'))).status).toBe(500);
  });
});
