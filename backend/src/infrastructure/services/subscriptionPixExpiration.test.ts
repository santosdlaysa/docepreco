import { pool } from '../database/connection';
import { cancelPendingMpPixPayment, getMpPaymentInfo } from './mercadoPagoService';
import {
  closeUnpaidSubscriptionPix,
  expireSubscriptionPixRequests,
  subscriptionPixDeadlineSql,
  SUBSCRIPTION_MP_EXPIRATION_MINUTES,
  SUBSCRIPTION_PIX_TTL_MINUTES,
} from './subscriptionPixExpiration';

jest.mock('../database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('./mercadoPagoService', () => ({
  cancelPendingMpPixPayment: jest.fn(),
  getMpPaymentInfo: jest.fn(),
}));

const query = pool.query as jest.Mock;
const paymentInfo = jest.mocked(getMpPaymentInfo);
const cancelPayment = jest.mocked(cancelPendingMpPixPayment);
const requestId = 'a89d52d8-671f-459f-8116-91c1c67cee40';
const paymentId = '123456';

beforeEach(() => {
  jest.resetAllMocks();
});

test('the app targets 25 minutes and the provider deadline meets its minimum', () => {
  expect(SUBSCRIPTION_PIX_TTL_MINUTES).toBe(25);
  expect(SUBSCRIPTION_MP_EXPIRATION_MINUTES).toBeGreaterThanOrEqual(30);
  expect(subscriptionPixDeadlineSql).toContain("created_at + INTERVAL '25 minutes'");
});

test('marks a pending request expired only after the provider confirms cancellation', async () => {
  paymentInfo.mockResolvedValue({ status: 'pending', externalReference: requestId });
  cancelPayment.mockResolvedValue('cancelled');
  query.mockResolvedValue({ rowCount: 1 });

  await expect(closeUnpaidSubscriptionPix(requestId, paymentId)).resolves.toBe(true);
  expect(cancelPayment).toHaveBeenCalledWith(paymentId, expect.any(AbortSignal));
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining("WHERE id = $1 AND mp_payment_id = $2 AND status = 'pending'"),
    [requestId, paymentId]
  );
});

test.each(['approved', 'in_process', 'authorized'])('leaves a %s payment intact', async status => {
  paymentInfo.mockResolvedValue({ status, externalReference: requestId });

  await expect(closeUnpaidSubscriptionPix(requestId, paymentId)).resolves.toBe(false);
  expect(cancelPayment).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

test('does not expire the request if cancellation failed during payment confirmation', async () => {
  paymentInfo.mockResolvedValue({ status: 'pending', externalReference: requestId });
  cancelPayment.mockRejectedValue(new Error('HTTP 409'));

  await expect(closeUnpaidSubscriptionPix(requestId, paymentId)).rejects.toThrow('HTTP 409');
  expect(query).not.toHaveBeenCalled();
});

test('leaves a payment intact when its provider reference belongs to another request', async () => {
  paymentInfo.mockResolvedValue({ status: 'pending', externalReference: 'other-request' });

  await expect(closeUnpaidSubscriptionPix(requestId, paymentId)).resolves.toBe(false);
  expect(cancelPayment).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

test('reconciles a payment already cancelled even if another worker updated the request', async () => {
  paymentInfo.mockResolvedValue({ status: 'cancelled', externalReference: requestId });
  query.mockResolvedValue({ rowCount: 0 });

  await expect(closeUnpaidSubscriptionPix(requestId, paymentId)).resolves.toBe(false);
  expect(cancelPayment).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledTimes(1);
});

test('only looks up overdue dynamic subscription Pix for the requested user', async () => {
  query.mockResolvedValue({ rows: [] });

  await expireSubscriptionPixRequests(requestId);
  const [sql, values] = query.mock.calls[0];
  expect(sql).toContain("product_type = 'subscription' AND status = 'pending' AND mp_payment_id IS NOT NULL");
  expect(sql).toContain("NOT (manual_confirmation OR (expires_at IS NULL AND plan_label LIKE 'Plano %'))");
  expect(sql).toContain(`${subscriptionPixDeadlineSql} <= NOW()`);
  expect(values).toEqual([requestId]);
  expect(paymentInfo).not.toHaveBeenCalled();
});
