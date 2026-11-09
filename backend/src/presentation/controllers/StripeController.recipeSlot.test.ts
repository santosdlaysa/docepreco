jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('stripe', () => jest.fn());
jest.mock('../../infrastructure/services/telegramService', () => ({ notifyPremiumEvent: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));
jest.mock('../../infrastructure/repositories/PostgresPushTokenRepository', () => ({ PostgresPushTokenRepository: jest.fn() }));
import { StripeController } from './StripeController';
import { pool } from '../../infrastructure/database/connection';
const Stripe = require('stripe');

describe('permanent recipe slot payment', () => {
  beforeEach(() => { jest.clearAllMocks(); process.env.STRIPE_SECRET_KEY = 'test'; process.env.STRIPE_WEBHOOK_SECRET = 'test'; });
  async function deliver(overrides: any = {}) {
    Stripe.mockImplementation(() => ({ webhooks: { constructEvent: () => ({ type: 'checkout.session.completed', data: { object: {
      id: 'cs_test', mode: 'payment', payment_status: 'paid', amount_total: 1099, currency: 'brl',
      metadata: { userId: 'user', product: 'recipe_slot' }, ...overrides,
    } } }) } }));
    const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await new StripeController().webhook({ headers: {}, body: '' } as any, res);
    return res;
  }
  it('records confirmed payment once per checkout even on retries', async () => {
    await deliver(); await deliver();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (checkout_session_id) DO NOTHING'), ['cs_test', 'user']);
  });
  it.each([{ payment_status: 'unpaid' }, { amount_total: 1 }, { currency: 'usd' }, { mode: 'subscription' }])('rejects invalid payment %p', async overrides => {
    await deliver(overrides); expect(pool.query).not.toHaveBeenCalled();
  });
  it('asks Stripe to retry on database failure', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const res = await deliver(); expect(res.status).toHaveBeenCalledWith(500);
  });
});
