import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import routes from './whatsappSalesRoutes';
import { pool } from '../../infrastructure/database/connection';
import { getWhatsAppStatus } from '../../infrastructure/services/whatsappService';
jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn(), connect: jest.fn() } }));
jest.mock('../../infrastructure/services/whatsappService', () => ({ getWhatsAppStatus: jest.fn() }));
const app = express(); app.use(express.json()); app.use((req, _res, next) => { (req as any).userId = 'owner'; next(); }); app.use(routes);
const originalEnabled = process.env.WHATSAPP_SALES_ENABLED;
const client = { query: jest.fn(), release: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks(); process.env.WHATSAPP_SALES_ENABLED = 'true';
  jest.mocked(getWhatsAppStatus).mockReturnValue({ state: 'configured', provider: 'meta-cloud-api' });
  jest.mocked(pool.query).mockResolvedValue({ rows: [] } as never);
  jest.mocked(pool.connect).mockResolvedValue(client as never);
  client.query.mockResolvedValue({ rows: [] });
});
afterEach(() => { if (originalEnabled === undefined) delete process.env.WHATSAPP_SALES_ENABLED; else process.env.WHATSAPP_SALES_ENABLED = originalEnabled; });
it('returns only the authenticated account link', async () => {
  jest.mocked(pool.query).mockResolvedValue({ rows: [{ phone: '5592999999999' }] } as never);
  const response = await request(app).get('/');
  expect(response.status).toBe(200); expect(response.body.data.phone).toBe('5592999999999');
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=$1'), ['owner']);
});
it('issues a short-lived code and stores only its hash bound to the requested phone', async () => {
  const response = await request(app).post('/link-code').send({ phone: '+55 (92) 99999-9999' });
  expect(response.status).toBe(200); expect(response.body.data.code).toMatch(/^[A-F0-9]{24}$/);
  const hash = crypto.createHash('sha256').update(response.body.data.code).digest('hex');
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '10 minutes'"), ['owner', hash, '5592999999999']);
});
it('rejects unavailable configuration and invalid phones before issuing a code', async () => {
  process.env.WHATSAPP_SALES_ENABLED = 'false';
  expect((await request(app).post('/link-code').send({ phone: '5592999999999' })).status).toBe(503);
  process.env.WHATSAPP_SALES_ENABLED = 'true';
  expect((await request(app).post('/link-code').send({ phone: 'wrong' })).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});
it('does not silently replace an existing linked account or number', async () => {
  jest.mocked(pool.query).mockResolvedValue({ rows: [{ found: 1 }] } as never);
  expect((await request(app).post('/link-code').send({ phone: '5592999999999' })).status).toBe(409);
  expect(pool.query).toHaveBeenCalledTimes(1);
});
it('serializes unlinking, cancels queued replies and revokes link codes in one transaction', async () => {
  client.query.mockImplementation(async (sql: string) => ({ rows: sql.includes('UNION SELECT phone') ? [{ phone: '5592999999999' }] : [] }));
  expect((await request(app).delete('/')).status).toBe(200);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['5592999999999']);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE whatsapp_sale_inbox SET reply=NULL'), ['owner']);
  expect(client.query).toHaveBeenCalledWith('DELETE FROM whatsapp_sale_links WHERE user_id=$1', ['owner']);
  expect(client.query).toHaveBeenCalledWith('DELETE FROM whatsapp_link_codes WHERE user_id=$1', ['owner']);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
});
