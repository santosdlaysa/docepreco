import express from 'express';
import request from 'supertest';
import orderRoutes from './orderRoutes';
import { getProductionPlan } from '../controllers/ProductionController';
import { OrderController } from '../controllers/OrderController';

jest.mock('../controllers/ProductionController', () => ({
  getProductionPlan: jest.fn((_req, res) => res.json({ success: true, data: { orderCount: 0 } })),
}));
jest.mock('../controllers/OrderController');

it('routes production-plan to the planner before the order ID handler', async () => {
  const app = express();
  app.use('/api/orders', orderRoutes);
  const response = await request(app).get('/api/orders/production-plan?start=2026-09-14&end=2026-09-20');
  expect(response.status).toBe(200);
  expect(getProductionPlan).toHaveBeenCalledTimes(1);
  expect(OrderController.prototype.getById).not.toHaveBeenCalled();
});
