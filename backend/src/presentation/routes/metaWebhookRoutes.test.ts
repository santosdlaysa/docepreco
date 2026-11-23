import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import routes from './metaWebhookRoutes';
import { enqueueWhatsAppSales } from '../../infrastructure/services/whatsappSales';
import { recordMessageUpdate } from '../../infrastructure/services/whatsappService';
jest.mock('../../infrastructure/services/whatsappSales', () => ({ enqueueWhatsAppSales: jest.fn() }));
jest.mock('../../infrastructure/services/whatsappService', () => ({ recordMessageUpdate: jest.fn() }));
const app = express(); app.use(express.raw({ type: 'application/json' })); app.use(routes);
const secret = 'test-meta-secret';
const raw = JSON.stringify({ entry: [] });
const sign = (body: string) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
let previous: string | undefined;
beforeEach(() => { jest.clearAllMocks(); previous = process.env.META_APP_SECRET; process.env.META_APP_SECRET = secret; jest.mocked(enqueueWhatsAppSales).mockResolvedValue(); });
afterEach(() => { if (previous === undefined) delete process.env.META_APP_SECRET; else process.env.META_APP_SECRET = previous; });
it('rejects unsigned events before queueing anything', async () => {
  expect((await request(app).post('/webhooks/whatsapp').set('Content-Type', 'application/json').send(raw)).status).toBe(403);
  expect(enqueueWhatsAppSales).not.toHaveBeenCalled();
});
it('verifies the raw body and persists inbound messages before acknowledging', async () => {
  const res = await request(app).post('/webhooks/whatsapp').set('Content-Type', 'application/json').set('x-hub-signature-256', sign(raw)).send(raw);
  expect(res.status).toBe(200); expect(enqueueWhatsAppSales).toHaveBeenCalledWith({ entry: [] }); expect(recordMessageUpdate).toHaveBeenCalledWith({ entry: [] });
});
it('returns 500 on queue failure so the provider can retry', async () => {
  jest.mocked(enqueueWhatsAppSales).mockRejectedValue(new Error('database down'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await request(app).post('/webhooks/whatsapp').set('Content-Type', 'application/json').set('x-hub-signature-256', sign(raw)).send(raw)).status).toBe(500);
  } finally { log.mockRestore(); }
});
