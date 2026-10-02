import express from 'express';
import request from 'supertest';
import { WinbackController } from './WinbackController';
import { pool } from '../../infrastructure/database/connection';
import { sendWinbackEmail } from '../../infrastructure/services/emailService';
import { PostgresPushTokenRepository } from '../../infrastructure/repositories/PostgresPushTokenRepository';

jest.mock('../../infrastructure/database/connection', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../infrastructure/services/emailService', () => ({ sendWinbackEmail: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../../infrastructure/services/whatsappService', () => ({ sendWhatsAppMessage: jest.fn() }));
jest.mock('../../infrastructure/repositories/PostgresPushTokenRepository');

const controller = new WinbackController();
const app = express();
app.use(express.json());
app.get('/eligible', controller.listEligible);
app.post('/send', controller.sendCampaign);
const user = {
  id: 'former-subscriber', company_name: 'Doces', email: 'test@example.com',
  phone: null, premium_until: new Date('2020-01-01'), last_product: null,
};
const client = { query: jest.fn(), release: jest.fn() };

beforeEach(() => {
  jest.resetAllMocks();
  (pool.query as jest.Mock).mockImplementation(async (sql: string) => ({
    rows: sql.includes('FROM users u') ? [user] : [],
  }));
  (pool.connect as jest.Mock).mockResolvedValue(client);
  client.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('SELECT id FROM users') ? [{ id: user.id }]
      : sql.includes('INSERT INTO winback_offers') ? [{ id: 'new-offer' }] : [],
  }));
  jest.mocked(PostgresPushTokenRepository.prototype.findByUserId).mockResolvedValue([]);
  jest.mocked(sendWinbackEmail).mockResolvedValue(undefined);
});

it('filters the campaign to the selected recipient for an individual send', async () => {
  const response = await request(app).post('/send').send({ userIds: [user.id], discountPercent: 35, validDays: 3, includeChat: true });
  expect(response.status).toBe(200);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('AND u.id = ANY($1::uuid[])'), [[user.id]]);
  expect(response.body.data.users.map((entry: { userId: string }) => entry.userId)).toEqual([user.id]);
  expect(sendWinbackEmail).toHaveBeenCalledTimes(1);
  expect(sendWinbackEmail).toHaveBeenCalledWith(user.email, user.company_name, expect.objectContaining({ discountPercent: 35 }));
});

it.each([[], null, '', ['']])('rejects an invalid recipient selection %j instead of sending to everyone', async userIds => {
  expect((await request(app).post('/send').send({ userIds })).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
  expect(sendWinbackEmail).not.toHaveBeenCalled();
});

it('does not fall back to the entire campaign if the selected recipient is no longer eligible', async () => {
  jest.mocked(pool.query).mockResolvedValue({ rows: [] } as never);
  const response = await request(app).post('/send').send({ userIds: [user.id] });
  expect(response.status).toBe(200);
  expect(response.body.data.offersCreated).toBe(0);
  expect(pool.connect).not.toHaveBeenCalled();
  expect(sendWinbackEmail).not.toHaveBeenCalled();
});

it('saves an individual chat offer with its subscription button before committing', async () => {
  const response = await request(app).post('/send').send({ discountPercent: 40, validDays: 7, includeChat: true });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ offersCreated: 1, chatSent: 1 });
  expect(response.body.data.users[0].chat).toBe(true);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO support_messages'),
    [user.id, expect.stringContaining('40% de desconto')]);
  const calls = client.query.mock.calls;
  const chatIndex = calls.findIndex(([sql]) => sql.includes('INSERT INTO support_messages'));
  expect(calls[chatIndex][1][1]).toContain('[[assinar:premium]]');
  expect(calls[chatIndex + 1][0]).toBe('COMMIT');
});

it('does not write to chat when the option is off', async () => {
  const response = await request(app).post('/send').send({ includeChat: false });
  expect(response.body.data.chatSent).toBe(0);
  expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO support_messages'))).toBe(false);
});

it('rolls back the offer when the requested chat delivery cannot be saved', async () => {
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO support_messages')) throw new Error('Chat failed');
    return { rows: sql.includes('SELECT id FROM users') ? [{ id: user.id }]
      : sql.includes('INSERT INTO winback_offers') ? [{ id: 'offer' }] : [] };
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request(app).post('/send').send({ includeChat: true });
  expect(response.status).toBe(500);
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(sendWinbackEmail).not.toHaveBeenCalled();
  log.mockRestore();
});

it('includes previous campaign recipients in the preview and allows immediate repeat sends', async () => {
  expect((await request(app).get('/eligible')).body.data).toHaveLength(1);
  for (const discountPercent of [50, 30]) {
    const response = await request(app).post('/send').send({ discountPercent, validDays: 7 });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ offersCreated: 1, emailSent: 1 });
  }
  const eligibilityQueries = (pool.query as jest.Mock).mock.calls.filter(([sql]) => sql.includes('FROM users u'));
  for (const [sql] of eligibilityQueries) {
    expect(sql).not.toContain('NOT EXISTS');
    expect(sql).toContain('u.is_premium = FALSE');
    expect(sql).toContain('u.premium_until <= NOW()');
  }
  expect(sendWinbackEmail).toHaveBeenCalledTimes(2);
  expect(sendWinbackEmail).toHaveBeenLastCalledWith(user.email, user.company_name,
    expect.objectContaining({ discountPercent: 30 }));
  const statements = client.query.mock.calls.map(([sql]) => sql);
  expect(statements).toEqual([
    'BEGIN', expect.stringContaining('FOR UPDATE'), expect.stringContaining("status = 'cancelled'"),
    expect.stringContaining('INSERT INTO winback_offers'), 'COMMIT',
    'BEGIN', expect.stringContaining('FOR UPDATE'), expect.stringContaining("status = 'cancelled'"),
    expect.stringContaining('INSERT INTO winback_offers'), 'COMMIT',
  ]);
});

it('rolls back replacement and sends no messages if the new offer cannot be created', async () => {
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO winback_offers')) throw new Error('Insert failed');
    return { rows: sql.includes('SELECT id FROM users') ? [{ id: user.id }] : [] };
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await request(app).post('/send').send({})).status).toBe(500);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(sendWinbackEmail).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it('skips recipients who have renewed since the preview', async () => {
  client.query.mockResolvedValue({ rows: [] });
  const response = await request(app).post('/send').send({});
  expect(response.body.data).toMatchObject({ offersCreated: 0, emailSent: 0, users: [] });
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(sendWinbackEmail).not.toHaveBeenCalled();
});
