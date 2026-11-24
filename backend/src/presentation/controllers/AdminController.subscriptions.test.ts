import { Request, Response } from 'express';
import { pool } from '../../infrastructure/database/connection';
import { AdminController } from './AdminController';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));
jest.mock('../../infrastructure/services/emailService', () => ({ sendBulkUpdateEmail: jest.fn(), sendReturnAccessEmail: jest.fn() }));
jest.mock('../../infrastructure/services/pushService', () => ({ sendPushNotifications: jest.fn() }));

describe('Subscription dashboard currency units', () => {
  const query = pool.query as jest.Mock;
  beforeEach(() => query.mockReset());

  it.each([['1999', 19.99], [null, 0], [0, 0], [1667.325, 16.67325]])(
    'converts average cents %s to BRL %s without multiplying currency by 100',
    async (avgValue, expected) => {
      query.mockResolvedValueOnce({ rows: [{ avgValue, activeSubscribers: 2, totalReceivedCents: '3998', monthlyReceivedCents: '1999' }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      await new AdminController().getSubscriptionDashboard({} as Request, res as unknown as Response);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.overview.avgValueBRL).toBeCloseTo(expected, 8);
      expect(body.data.overview.totalReceivedBRL).toBe(39.98);
      expect(body.data.overview.monthlyReceivedBRL).toBe(19.99);
      expect(query).toHaveBeenCalledTimes(4);
      for (const [sql] of query.mock.calls) expect(sql.trim()).toMatch(/^SELECT/);
    },
  );
});
