import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockPoolQuery = jest.fn();
const ingredientRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const saleRepo = { findAll: jest.fn(), create: jest.fn(), delete: jest.fn() };
const seasonRepo = { findAll: jest.fn(), findActive: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
const goalRepo = { findByMonthYear: jest.fn(), upsert: jest.fn() };
const priceRepo = { findByIngredient: jest.fn(), add: jest.fn() };
const expenseRepo = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), getSummary: jest.fn() };
const pushRepo = { upsert: jest.fn(), removeByToken: jest.fn() };

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));
jest.mock('../infrastructure/repositories/PostgresIngredientRepository', () => ({
  PostgresIngredientRepository: jest.fn(() => ingredientRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSaleRepository', () => ({
  PostgresSaleRepository: jest.fn(() => saleRepo),
}));
jest.mock('../infrastructure/repositories/PostgresSeasonRepository', () => ({
  PostgresSeasonRepository: jest.fn(() => seasonRepo),
}));
jest.mock('../infrastructure/repositories/PostgresGoalRepository', () => ({
  PostgresGoalRepository: jest.fn(() => goalRepo),
}));
jest.mock('../infrastructure/repositories/PostgresPriceHistoryRepository', () => ({
  PostgresPriceHistoryRepository: jest.fn(() => priceRepo),
}));
jest.mock('../infrastructure/repositories/PostgresExpenseRepository', () => ({
  PostgresExpenseRepository: jest.fn(() => expenseRepo),
}));
jest.mock('../infrastructure/repositories/PostgresPushTokenRepository', () => ({
  PostgresPushTokenRepository: jest.fn(() => pushRepo),
}));

import { authMiddleware } from '../presentation/middleware/authMiddleware';
import ingredientRoutes from '../presentation/routes/ingredientRoutes';
import saleRoutes from '../presentation/routes/saleRoutes';
import seasonRoutes from '../presentation/routes/seasonRoutes';
import goalRoutes from '../presentation/routes/goalRoutes';
import priceHistoryRoutes from '../presentation/routes/priceHistoryRoutes';
import expenseRoutes from '../presentation/routes/expenseRoutes';
import pushTokenRoutes from '../presentation/routes/pushTokenRoutes';
import statsRoutes from '../presentation/routes/statsRoutes';

const JWT_SECRET = 'user-operations-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/ingredients', authMiddleware, ingredientRoutes);
  app.use('/sales', authMiddleware, saleRoutes);
  app.use('/seasons', authMiddleware, seasonRoutes);
  app.use('/goals', authMiddleware, goalRoutes);
  app.use('/ingredients/:ingredientId/price-history', authMiddleware, priceHistoryRoutes);
  app.use('/push-tokens', authMiddleware, pushTokenRoutes);
  app.use('/stats', authMiddleware, statsRoutes);
  app.use('/', expenseRoutes);
  return app;
}

function api(method: 'get' | 'post' | 'put' | 'delete', path: string) {
  return request(createApp())[method](path).set('Authorization', `Bearer ${token}`);
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  for (const repo of [ingredientRepo, saleRepo, seasonRepo, goalRepo, priceRepo, expenseRepo, pushRepo]) {
    for (const fn of Object.values(repo)) fn.mockReset();
  }
  mockPoolQuery.mockReset();
  mockPoolQuery.mockImplementation((sql: string) => {
    if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

describe('Ingredientes', () => {
  it('lista ingredientes do usuário', async () => {
    ingredientRepo.findAll.mockResolvedValue([{ id: 'i1', name: 'Farinha' }]);
    const res = await api('get', '/ingredients');
    expect(res.status).toBe(200);
    expect(ingredientRepo.findAll).toHaveBeenCalledWith(USER_ID);
  });

  it('retorna 404 ao buscar ingrediente inexistente', async () => {
    ingredientRepo.findById.mockResolvedValue(null);
    expect((await api('get', '/ingredients/missing')).status).toBe(404);
  });

  it('valida e cria ingrediente', async () => {
    ingredientRepo.findByName.mockResolvedValue(null);
    ingredientRepo.create.mockResolvedValue({ id: 'i1', name: 'Farinha' });
    const res = await api('post', '/ingredients').send({
      name: 'Farinha', purchaseQuantity: 1, purchasePrice: 10, unit: 'kg',
    });
    expect(res.status).toBe(201);
    expect(ingredientRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Farinha' }), USER_ID);
  });

  it('rejeita ingrediente inválido e duplicado', async () => {
    expect((await api('post', '/ingredients').send({ name: '', purchaseQuantity: 1, purchasePrice: 10 })).status).toBe(400);
    ingredientRepo.findByName.mockResolvedValue({ id: 'existing' });
    expect((await api('post', '/ingredients').send({ name: 'Farinha', purchaseQuantity: 1, purchasePrice: 10 })).status).toBe(409);
  });

  it('atualiza e rejeita ingrediente inexistente', async () => {
    ingredientRepo.findById.mockResolvedValueOnce({ id: 'i1' });
    ingredientRepo.update.mockResolvedValue({ id: 'i1', name: 'Nova' });
    expect((await api('put', '/ingredients/i1').send({ name: 'Nova' })).status).toBe(200);
    ingredientRepo.findById.mockResolvedValueOnce(null);
    expect((await api('put', '/ingredients/missing').send({ name: 'Nova' })).status).toBe(400);
  });

  it('exclui e trata ingrediente em uso', async () => {
    ingredientRepo.findById.mockResolvedValue({ id: 'i1' });
    ingredientRepo.delete.mockResolvedValueOnce(true);
    expect((await api('delete', '/ingredients/i1')).status).toBe(200);
    ingredientRepo.delete.mockRejectedValueOnce(Object.assign(new Error('23503'), { code: '23503' }));
    expect((await api('delete', '/ingredients/i1')).status).toBe(409);
  });
});

describe('Vendas', () => {
  it('lista, cria e exclui vendas', async () => {
    saleRepo.findAll.mockResolvedValue([{ id: 's1' }]);
    expect((await api('get', '/sales?period=week')).status).toBe(200);
    expect(saleRepo.findAll).toHaveBeenCalledWith(USER_ID, expect.any(String));

    saleRepo.create.mockResolvedValue({ id: 's1' });
    const created = await api('post', '/sales').send({
      recipeId: 'r1', quantitySold: 2, salePrice: 30, saleDate: '2026-06-15',
    });
    expect(created.status).toBe(201);

    saleRepo.delete.mockResolvedValueOnce(true);
    expect((await api('delete', '/sales/s1')).status).toBe(200);
    saleRepo.delete.mockResolvedValueOnce(false);
    expect((await api('delete', '/sales/missing')).status).toBe(404);
  });

  it('rejeita venda incompleta e erro de domínio', async () => {
    expect((await api('post', '/sales').send({ recipeId: 'r1' })).status).toBe(400);
    saleRepo.create.mockRejectedValue(new Error('Receita inválida'));
    const res = await api('post', '/sales').send({
      recipeId: 'r1', quantitySold: 1, salePrice: 20, saleDate: '2026-06-15',
    });
    expect(res.status).toBe(400);
  });
});

describe('Temporadas', () => {
  it('executa CRUD e consulta ativa', async () => {
    seasonRepo.findAll.mockResolvedValue([]);
    seasonRepo.findActive.mockResolvedValue(null);
    expect((await api('get', '/seasons')).status).toBe(200);
    expect((await api('get', '/seasons/active')).status).toBe(200);

    seasonRepo.create.mockResolvedValue({ id: 'season-1' });
    expect((await api('post', '/seasons').send({
      name: 'Natal', startDate: '2026-12-01', endDate: '2026-12-25', multiplier: 1.2,
    })).status).toBe(201);

    seasonRepo.update.mockResolvedValueOnce({ id: 'season-1' });
    expect((await api('put', '/seasons/season-1').send({ multiplier: 1.3 })).status).toBe(200);
    seasonRepo.update.mockResolvedValueOnce(null);
    expect((await api('put', '/seasons/missing').send({ multiplier: 1.3 })).status).toBe(404);

    seasonRepo.delete.mockResolvedValueOnce(true);
    expect((await api('delete', '/seasons/season-1')).status).toBe(200);
  });

  it('rejeita criação incompleta', async () => {
    expect((await api('post', '/seasons').send({ name: 'Natal' })).status).toBe(400);
  });
});

describe('Metas e histórico de preços', () => {
  it('consulta e salva meta válida', async () => {
    goalRepo.findByMonthYear.mockResolvedValue({ amount: 1000 });
    expect((await api('get', '/goals/6/2026')).status).toBe(200);
    goalRepo.upsert.mockResolvedValue({ amount: 1200 });
    expect((await api('put', '/goals/6/2026').send({ amount: 1200 })).status).toBe(200);
  });

  it('rejeita parâmetros de meta inválidos', async () => {
    expect((await api('get', '/goals/x/2026')).status).toBe(400);
    expect((await api('put', '/goals/6/2026').send({ amount: 0 })).status).toBe(400);
  });

  it('lista, adiciona e valida histórico de preço', async () => {
    priceRepo.findByIngredient.mockResolvedValue([]);
    expect((await api('get', '/ingredients/i1/price-history')).status).toBe(200);
    priceRepo.add.mockResolvedValue({ id: 'p1' });
    expect((await api('post', '/ingredients/i1/price-history').send({
      price: 10, purchaseQuantity: 1, unit: 'kg',
    })).status).toBe(201);
    expect((await api('post', '/ingredients/i1/price-history').send({ price: '10' })).status).toBe(400);
  });
});

describe('Despesas', () => {
  it('executa listagem, resumo e CRUD', async () => {
    expenseRepo.findAll.mockResolvedValue([]);
    expect((await api('get', '/expenses?month=2026-06')).status).toBe(200);

    expenseRepo.getSummary.mockResolvedValue({ total: 100 });
    expect((await api('get', '/expenses/summary?month=2026-06')).status).toBe(200);

    expenseRepo.create.mockResolvedValue({ id: 'e1' });
    expect((await api('post', '/expenses').send({
      description: 'Gás', amount: 100, category: 'produção', costType: 'variable', expenseDate: '2026-06-15',
    })).status).toBe(201);

    expenseRepo.update.mockResolvedValueOnce({ id: 'e1' });
    expect((await api('put', '/expenses/e1').send({ amount: 120 })).status).toBe(200);
    expenseRepo.update.mockResolvedValueOnce(null);
    expect((await api('put', '/expenses/missing').send({ amount: 120 })).status).toBe(404);

    expenseRepo.delete.mockResolvedValue(true);
    expect((await api('delete', '/expenses/e1')).status).toBe(200);
  });

  it('rejeita dados obrigatórios ausentes', async () => {
    expect((await api('post', '/expenses').send({ description: 'Gás' })).status).toBe(400);
    expect((await api('get', '/expenses/summary')).status).toBe(400);
  });
});

describe('Push tokens e estatísticas', () => {
  it('registra e remove token push', async () => {
    mockPoolQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users')) return Promise.resolve({ rows: [{ exists: 1 }] });
      return Promise.resolve({ rows: [] });
    });
    pushRepo.upsert.mockResolvedValue({ token: 'ExponentPushToken[x]' });
    expect((await api('post', '/push-tokens').send({
      token: 'ExponentPushToken[x]', platform: 'android',
    })).status).toBe(201);
    pushRepo.removeByToken.mockResolvedValue(undefined);
    expect((await api('delete', '/push-tokens').send({ token: 'ExponentPushToken[x]' })).status).toBe(200);
  });

  it('valida token, plataforma e usuário', async () => {
    expect((await api('post', '/push-tokens').send({})).status).toBe(400);
    expect((await api('post', '/push-tokens').send({ token: 'x', platform: 'windows' })).status).toBe(400);
    expect((await api('post', '/push-tokens').send({ token: 'x', platform: 'ios' })).status).toBe(401);
    expect((await api('delete', '/push-tokens').send({})).status).toBe(400);
  });

  it('retorna estatísticas agregadas', async () => {
    mockPoolQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (sql.includes('COUNT(*) FROM recipes')) return Promise.resolve({ rows: [{ count: '2' }] });
      if (sql.includes('COUNT(*) FROM ingredients')) return Promise.resolve({ rows: [{ count: '3' }] });
      if (sql.includes('COALESCE(SUM(total_revenue)')) return Promise.resolve({ rows: [{ count: '4', revenue: '150.50' }] });
      if (sql.includes('LIMIT 5')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const res = await api('get', '/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      recipesCount: 2, ingredientsCount: 3, monthlySalesCount: 4, monthlyRevenue: 150.5,
    });
  });

  it('retorna 500 quando estatísticas falham', async () => {
    mockPoolQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      return Promise.reject(new Error('database unavailable'));
    });
    expect((await api('get', '/stats')).status).toBe(500);
  });
});
