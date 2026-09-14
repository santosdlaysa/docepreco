import express from 'express';
import request from 'supertest';
import { getProductionPlan } from './ProductionController';
import { PostgresOrderRepository } from '../../infrastructure/repositories/PostgresOrderRepository';
import { PostgresRecipeRepository } from '../../infrastructure/repositories/PostgresRecipeRepository';
import { PostgresIngredientRepository } from '../../infrastructure/repositories/PostgresIngredientRepository';
import { PostgresStockRepository } from '../../infrastructure/repositories/PostgresStockRepository';

jest.mock('../../infrastructure/repositories/PostgresOrderRepository');
jest.mock('../../infrastructure/repositories/PostgresRecipeRepository');
jest.mock('../../infrastructure/repositories/PostgresIngredientRepository');
jest.mock('../../infrastructure/repositories/PostgresStockRepository');

const orders = jest.mocked(PostgresOrderRepository.prototype.findAll);
const recipes = jest.mocked(PostgresRecipeRepository.prototype.findAll);
const ingredients = jest.mocked(PostgresIngredientRepository.prototype.findAll);
const stock = jest.mocked(PostgresStockRepository.prototype.getState);
const app = express();
app.get('/plan', (req, res) => getProductionPlan(Object.assign(req, { userId: 'authenticated-owner' }), res));

beforeEach(() => {
  jest.clearAllMocks();
  orders.mockResolvedValue([]); recipes.mockResolvedValue([]); ingredients.mockResolvedValue([]);
  stock.mockResolvedValue({ items: [], movements: [] });
});

it.each([
  '', '?start=2026-09-20&end=2026-09-14', '?start=2026-02-30&end=2026-03-01',
  '?start=2026-09-14junk&end=2026-09-19', '?start[]=2026-09-14&end=2026-09-19',
])('rejects invalid periods before reading repositories: %s', async query => {
  expect((await request(app).get('/plan' + query)).status).toBe(400);
  expect(orders).not.toHaveBeenCalled();
});

it('scopes every read to the authenticated account and ignores a supplied userId', async () => {
  const response = await request(app).get('/plan?start=2026-09-14&end=2026-09-14&userId=someone-else');
  expect(response.status).toBe(200);
  for (const method of [orders, recipes, ingredients, stock]) expect(method).toHaveBeenCalledWith('authenticated-owner');
  expect(response.body.data).toMatchObject({ orderCount: 0, products: [], ingredients: [] });
});

it('fails the plan rather than presenting an empty balance when stock cannot be read', async () => {
  stock.mockRejectedValue(new Error('database unavailable'));
  const response = await request(app).get('/plan?start=2026-09-14&end=2026-09-19');
  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
  expect(JSON.stringify(response.body)).not.toContain('database unavailable');
});
