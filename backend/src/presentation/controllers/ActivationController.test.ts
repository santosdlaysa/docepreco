import express from 'express';
import request from 'supertest';
import { ActivationController, activationFilters, ACTIVATION_REPORT_SQL } from './ActivationController';
import { pool } from '../../infrastructure/database/connection';

jest.mock('../../infrastructure/database/connection', () => ({ pool: { query: jest.fn() } }));
const app = express();
app.get('/activation', new ActivationController().report);
beforeEach(() => jest.clearAllMocks());

it('defaults safely and accepts only supported cohorts', () => {
  expect(activationFilters({})).toMatchObject({ days: 30, page: 1, limit: 20, pattern: '%%' });
  for (const days of ['7', '30', '90']) expect(activationFilters({ days }).days).toBe(Number(days));
  for (const days of ['91', '-1', '7.5', '7 OR 1=1']) expect(activationFilters({ days }).days).toBe(30);
});
it('bounds pagination, rejects malformed arrays and escapes wildcard search', () => {
  expect(activationFilters({ limit: '999', page: '0' })).toMatchObject({ limit: 50, page: 1 });
  expect(activationFilters({ limit: '-5', page: '3.5', search: ['a', 'b'] })).toMatchObject({ limit: 20, page: 1, search: '' });
  expect(activationFilters({ page: '9999999999999999999' }).page).toBe(1);
  expect(activationFilters({ search: '  100%_\\  ' }).pattern).toBe('%100\\%\\_\\\\%');
});
it('uses one parameterized snapshot and returns independent current states, retaining inactive accounts', async () => {
  const data = { totalAccounts: 4, withIngredients: 2, withRecipes: 1, withSales: 2, withoutRecipes: 3,
    total: 1, users: [{ id: 'id', companyName: 'Empresa', email: 'test@example.invalid', isActive: false }] };
  jest.mocked(pool.query).mockResolvedValue({ rows: [{ data }] } as never);
  const res = await request(app).get('/activation').query({ days: 7, limit: 50, page: 2, search: "';DROP TABLE users;--" });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: { ...data, days: 7, page: 2, limit: 50 } });
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(pool.query).toHaveBeenCalledWith(ACTIVATION_REPORT_SQL, [7, "%';DROP TABLE users;--%", 50, 50]);
  expect(ACTIVATION_REPORT_SQL).not.toContain('DROP TABLE');
  expect(ACTIVATION_REPORT_SQL).toContain('FROM cohort WHERE NOT has_recipe');
  expect(ACTIVATION_REPORT_SQL).not.toContain('is_active = TRUE');
});
it('returns generic errors without leaking SQL or personal data', async () => {
  jest.mocked(pool.query).mockRejectedValue(new Error('secret connection details') as never);
  const res = await request(app).get('/activation');
  expect(res.status).toBe(500);
  expect(res.body.success).toBe(false);
  expect(JSON.stringify(res.body)).not.toContain('secret');
});
