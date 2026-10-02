import express from 'express';
import request from 'supertest';
import { pool } from '../../infrastructure/database/connection';
import { WhatsAppOfferController } from './WhatsAppOfferController';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { connect: jest.fn() } }));
const app = express();
app.use(express.json());
app.post('/:userId', new WhatsAppOfferController().prepare);
const client = { query: jest.fn(), release: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  client.query.mockImplementation(async (sql: string) => ({ rows:
    sql.includes('SELECT id, company_name') ? [{ id: 'former', company_name: 'Doces', phone: '5592999999999' }]
      : sql.includes('INSERT INTO winback_offers') ? [{ id: 'offer', expires_at: new Date('2030-01-01') }] : [],
  }));
});
it('prepares an account-bound offer and message without sending WhatsApp', async () => {
  const response = await request(app).post('/former').send({ discountPercent: 30, validDays: 5 });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ offerId: 'offer', phone: '5592999999999' });
  expect(response.body.data.message).toContain('30% de desconto');
  expect(response.body.data.message).not.toContain('[[assinar');
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO winback_offers'), ['former', 30, 5]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});
it.each([{ discountPercent: 91, validDays: 7 }, { discountPercent: 50, validDays: 0 }])('rejects invalid settings %j', async body => {
  expect((await request(app).post('/former').send(body)).status).toBe(400);
  expect(pool.connect).not.toHaveBeenCalled();
});
it('rejects an ineligible recipient without replacing offers', async () => {
  client.query.mockResolvedValue({ rows: [] });
  expect((await request(app).post('/active').send({ discountPercent: 50, validDays: 7 })).status).toBe(400);
  expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', expect.stringContaining('premium_until <= NOW()'), 'ROLLBACK']);
});
it('rolls back replacement when creation fails', async () => {
  const original = client.query.getMockImplementation()!;
  client.query.mockImplementation(async (...args) => {
    if (args[0].includes('INSERT INTO winback_offers')) throw new Error('Insert failed');
    return original(...args);
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect((await request(app).post('/former').send({ discountPercent: 50, validDays: 7 })).status).toBe(500);
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  log.mockRestore();
});
