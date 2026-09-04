import express from 'express';
import request from 'supertest';

/**
 * Renovação de assinatura no Stripe.
 *
 * O bug que originou estes testes: a partir da API 2025-03-31.basil o campo
 * `current_period_end` saiu do objeto Subscription e passou a viver nos itens,
 * e o webhook não tratava as faturas — que são o evento de renovação.
 */

const subscriptions = { retrieve: jest.fn() };
const constructEvent = jest.fn();

jest.mock('stripe', () => jest.fn(() => ({
  webhooks: { constructEvent },
  subscriptions,
})), { virtual: true });

const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
jest.mock('../infrastructure/database/connection', () => ({ pool: { query: (...a: any[]) => query(...a) } }));

const updatePlanTier = jest.fn().mockResolvedValue({});
jest.mock('../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn(() => ({
    findById: jest.fn().mockResolvedValue({ id: 'u1', companyName: 'Doceria da Ana' }),
    updatePlanTier,
  })),
}));
jest.mock('../infrastructure/repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn(() => ({ findByUserId: jest.fn().mockResolvedValue([]) })),
}));
const notifyPremiumEvent = jest.fn();
jest.mock('../infrastructure/services/telegramService', () => ({ notifyPremiumEvent }));
jest.mock('../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));

const PERIOD_END = 1793000000; // epoch do fim do ciclo pago
const META = { userId: 'u1', plan: 'monthly', tier: 'premium' };

const makeApp = () => {
  const routes = require('../presentation/routes/stripeRoutes').default;
  const app = express();
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

const post = () => request(makeApp()).post('/api/stripe/webhook').set('stripe-signature', 'sig').send({});

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('Stripe webhook — renovação de assinatura', () => {
  it('estende o acesso quando a fatura do novo ciclo é paga', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: {
        billing_reason: 'subscription_cycle',
        amount_paid: 1490,
        currency: 'brl',
        parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1', metadata: META } },
      } },
    });
    subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1', status: 'active', metadata: META,
      items: { data: [{ current_period_end: PERIOD_END }] },
    });

    const res = await post();

    expect(res.status).toBe(200);
    expect(updatePlanTier).toHaveBeenCalledWith('u1', 'premium', new Date(PERIOD_END * 1000), 'card');
    expect(notifyPremiumEvent).toHaveBeenCalledWith('Doceria da Ana', 'RENEWAL', 'card');
  });

  it('lê o fim do ciclo dos itens da assinatura (API nova, sem current_period_end no topo)', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', metadata: META, items: { data: [{ current_period_end: PERIOD_END }] } } },
    });

    await post();

    expect(updatePlanTier).toHaveBeenCalledWith('u1', 'premium', new Date(PERIOD_END * 1000), 'card');
  });

  it('não libera acesso quando a assinatura foi cancelada', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'canceled', metadata: META, items: { data: [{ current_period_end: PERIOD_END }] } } },
    });

    const res = await post();

    expect(res.status).toBe(200);
    expect(updatePlanTier).not.toHaveBeenCalled();
  });

  it('não duplica histórico nem aviso quando o mesmo ciclo chega em dois eventos', async () => {
    query.mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 }); // ciclo já registrado
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', metadata: META, items: { data: [{ current_period_end: PERIOD_END }] } } },
    });

    await post();

    expect(updatePlanTier).toHaveBeenCalled();     // acesso continua garantido
    expect(notifyPremiumEvent).not.toHaveBeenCalled(); // mas sem repetir o aviso
  });
});
