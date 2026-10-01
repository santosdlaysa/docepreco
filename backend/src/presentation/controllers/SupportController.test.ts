import express from 'express';
import request from 'supertest';
import { SupportController } from './SupportController';
import { pool } from '../../infrastructure/database/connection';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn(), connect: jest.fn() } }));
jest.mock('../../infrastructure/services/telegramService', () => ({ notifySupportMessage: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../../infrastructure/repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn().mockImplementation(() => ({ findByUserId: jest.fn().mockResolvedValue([]) })),
}));

const app = express();
app.use(express.json());
app.post('/:userId/offer', new SupportController().adminSendDiscountOffer);
const client = { query: jest.fn(), release: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  client.query.mockImplementation(async (sql: string, params?: unknown[]) => ({ rows:
    sql.includes('SELECT id FROM users') ? [{ id: 'former' }]
      : sql.includes('INSERT INTO winback_offers') ? [{ expires_at: new Date('2030-01-01') }]
      : sql.includes('INSERT INTO support_messages') ? [{ id: 'message', user_id: params?.[0],
        sender_type: 'admin', message: params?.[2], created_at: new Date() }] : [],
  }));
});

it.each([0, 91, 2.5, '50'])('rejects invalid discount %s without writes', async discountPercent => {
  expect((await request(app).post('/former/offer').send({ discountPercent, validDays: 7 })).status).toBe(400);
  expect(pool.connect).not.toHaveBeenCalled();
});

it.each([0, 61, 1.5])('rejects invalid validity %s', async validDays => {
  expect((await request(app).post('/former/offer').send({ discountPercent: 50, validDays })).status).toBe(400);
  expect(pool.connect).not.toHaveBeenCalled();
});

it('rejects ineligible recipients and never saves an offer or message', async () => {
  client.query.mockResolvedValue({ rows: [] });
  expect((await request(app).post('/active/offer').send({ discountPercent: 50, validDays: 7 })).status).toBe(400);
  expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', expect.stringContaining('premium_until <= NOW() FOR UPDATE'), 'ROLLBACK']);
  expect(client.release).toHaveBeenCalled();
});

it('saves the discount and compatible subscription button in the same transaction', async () => {
  const response = await request(app).post('/former/offer').send({ discountPercent: 30, validDays: 5 });
  expect(response.status).toBe(201);
  expect(response.body.data.message).toContain('30% de desconto');
  expect(response.body.data.message).toContain('[[assinar]]');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO winback_offers'), ['former', 30, 5]);
  expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
    'BEGIN', expect.stringContaining('is_premium = FALSE'), expect.stringContaining("status = 'cancelled'"),
    expect.stringContaining('INSERT INTO winback_offers'), expect.stringContaining('INSERT INTO support_messages'), 'COMMIT',
  ]);
});

it('rolls back the offer if saving the chat message fails', async () => {
  const original = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (...args) => {
    if (args[0].includes('INSERT INTO support_messages')) throw new Error('Database unavailable');
    return original(...args);
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request(app).post('/former/offer').send({ discountPercent: 50, validDays: 7 });
  expect(response.status).toBe(500);
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
  log.mockRestore();
});
