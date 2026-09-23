import express from 'express';
import request from 'supertest';
jest.mock('../../infrastructure/services/conversionService', () => ({
  conversionEvents: ['blocked', 'offer_viewed', 'offer_clicked', 'checkout_started'],
  conversionSources: ['recipe_limit', 'manual'],
  recordConversion: jest.fn().mockResolvedValue(undefined),
}));
import router from './conversionRoutes';
import { recordConversion } from '../../infrastructure/services/conversionService';
import { authMiddleware } from '../middleware/authMiddleware';
jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));

describe('conversion event input', () => {
  const event = { event: 'offer_viewed', source: 'recipe_limit', tier: 'premium', eventId: '11111111-1111-4111-8111-111111111111' };
  const app = express();
  app.use(express.json());
  app.use('/secured', authMiddleware, router);
  app.use('/events', (req, _res, next) => { (req as any).userId = 'authenticated-user'; next(); }, router);
  beforeEach(() => jest.clearAllMocks());
  it('requires authentication', async () => {
    expect((await request(app).post('/secured').send(event)).status).toBe(401);
    expect(recordConversion).not.toHaveBeenCalled();
  });
  it('ignores client-supplied identity and Free status', async () => {
    expect((await request(app).post('/events').send({ ...event, userId: 'someone-else', wasFree: true })).status).toBe(202);
    expect(recordConversion).toHaveBeenCalledWith('authenticated-user', event.event, event.source, event.tier, event.eventId);
  });
  it.each([{ event: 'payment_confirmed' }, { source: 'arbitrary' }, { tier: 'free' }, { eventId: 'invalid' }])('rejects invalid or client-confirmed payments: %o', async patch => {
    expect((await request(app).post('/events').send({ ...event, ...patch })).status).toBe(400);
    expect(recordConversion).not.toHaveBeenCalled();
  });
});
