import express from 'express';
import request from 'supertest';

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: { create: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }) },
  })),
}), { virtual: true });
jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
}));
jest.mock('../infrastructure/services/telegramService', () => ({
  sendDailyUserReport: jest.fn(),
  sendWeeklyReport: jest.fn(),
  sendDailyGoalProgress: jest.fn(),
}));
jest.mock('../infrastructure/services/emailService', () => ({
  sendBulkUpdateEmail: jest.fn(),
}));
jest.mock('../infrastructure/services/appStoreConnectService', () => ({
  fetchDownloadsLastDays: jest.fn(),
}));

beforeAll(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'telegram-secret';
});

describe('POST /telegram/webhook', () => {
  it('rejeita secret inválido', async () => {
    const telegramRoutes = require('../presentation/routes/telegramRoutes').default;
    const app = express();
    app.use(express.json());
    app.use('/telegram', telegramRoutes);

    const res = await request(app).post('/telegram/webhook').send({});
    expect(res.status).toBe(401);
  });

  it('aceita atualização autenticada sem mensagem', async () => {
    const telegramRoutes = require('../presentation/routes/telegramRoutes').default;
    const app = express();
    app.use(express.json());
    app.use('/telegram', telegramRoutes);

    const res = await request(app)
      .post('/telegram/webhook')
      .set('x-telegram-bot-api-secret-token', 'telegram-secret')
      .send({});

    expect(res.status).toBe(200);
  });
});
