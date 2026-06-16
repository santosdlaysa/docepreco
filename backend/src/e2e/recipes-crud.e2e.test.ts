import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const poolQuery = jest.fn();
const recipeRepo = {
  findAll: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
};
const ingredientRepo = { findByIds: jest.fn() };
const userRepo = { findById: jest.fn(), countRecipes: jest.fn() };

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
jest.mock('../infrastructure/repositories/PostgresRecipeRepository', () => ({
  PostgresRecipeRepository: jest.fn(() => recipeRepo),
}));
jest.mock('../infrastructure/repositories/PostgresIngredientRepository', () => ({
  PostgresIngredientRepository: jest.fn(() => ingredientRepo),
}));
jest.mock('../infrastructure/repositories/PostgresUserRepository', () => ({
  PostgresUserRepository: jest.fn(() => userRepo),
}));
jest.mock('../infrastructure/services/referralService', () => ({
  processReferralActivation: jest.fn().mockResolvedValue(undefined),
}));

import recipeRoutes from '../presentation/routes/recipeRoutes';
import { authMiddleware } from '../presentation/middleware/authMiddleware';

const JWT_SECRET = 'recipes-crud-secret';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);
const recipe = {
  id: 'r1',
  name: 'Bolo',
  yield: 10,
  profitMargin: 30,
  ingredients: [],
  additionalCosts: [],
  subRecipes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const body = {
  name: 'Bolo',
  yield: 10,
  profitMargin: 30,
  ingredients: [],
  additionalCosts: [],
  subRecipes: [],
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/recipes', authMiddleware, recipeRoutes);
  return app;
}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string) =>
  request(createApp())[method](path).set('Authorization', `Bearer ${token}`);

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  for (const repo of [recipeRepo, ingredientRepo, userRepo]) {
    for (const fn of Object.values(repo)) fn.mockReset();
  }
  poolQuery.mockReset();
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
    if (sql.includes('plan_free_recipe_limit')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [] });
  });
});

describe('CRUD e cálculo de receitas', () => {
  it('lista e busca receita', async () => {
    recipeRepo.findAll.mockResolvedValue([recipe]);
    expect((await api('get', '/recipes')).status).toBe(200);
    recipeRepo.findById.mockResolvedValueOnce(recipe);
    expect((await api('get', '/recipes/r1')).status).toBe(200);
    recipeRepo.findById.mockResolvedValueOnce(null);
    expect((await api('get', '/recipes/missing')).status).toBe(404);
  });

  it('cria receita dentro do limite gratuito', async () => {
    userRepo.findById.mockResolvedValue({ isPremium: false, premiumUntil: null });
    userRepo.countRecipes.mockResolvedValue(1);
    recipeRepo.findByName.mockResolvedValue(null);
    recipeRepo.create.mockResolvedValue(recipe);

    const res = await api('post', '/recipes').send(body);

    expect(res.status).toBe(201);
    expect(recipeRepo.create).toHaveBeenCalledWith(body, USER_ID);
  });

  it('rejeita usuário inexistente, limite gratuito e receita inválida', async () => {
    userRepo.findById.mockResolvedValueOnce(null);
    expect((await api('post', '/recipes').send(body)).status).toBe(401);

    userRepo.findById.mockResolvedValueOnce({ isPremium: false, premiumUntil: null });
    userRepo.countRecipes.mockResolvedValueOnce(3);
    expect((await api('post', '/recipes').send(body)).status).toBe(403);

    userRepo.findById.mockResolvedValueOnce({ isPremium: true, premiumUntil: null });
    userRepo.countRecipes.mockResolvedValueOnce(10);
    expect((await api('post', '/recipes').send({ ...body, name: '' })).status).toBe(400);
  });

  it('rejeita receita duplicada', async () => {
    userRepo.findById.mockResolvedValue({ isPremium: true, premiumUntil: null });
    userRepo.countRecipes.mockResolvedValue(10);
    recipeRepo.findByName.mockResolvedValue(recipe);
    expect((await api('post', '/recipes').send(body)).status).toBe(409);
  });

  it('atualiza e exclui receita', async () => {
    recipeRepo.findById.mockResolvedValue(recipe);
    recipeRepo.findByName.mockResolvedValue(null);
    recipeRepo.update.mockResolvedValue({ ...recipe, name: 'Novo bolo' });
    expect((await api('put', '/recipes/r1').send({ name: 'Novo bolo' })).status).toBe(200);

    recipeRepo.delete.mockResolvedValue(true);
    expect((await api('delete', '/recipes/r1')).status).toBe(200);
  });

  it('rejeita atualização e exclusão de receita inexistente', async () => {
    recipeRepo.findById.mockResolvedValueOnce(null);
    expect((await api('put', '/recipes/missing').send({ name: 'Novo' })).status).toBe(400);
    recipeRepo.findById.mockResolvedValueOnce(null);
    expect((await api('delete', '/recipes/missing')).status).toBe(400);
  });

  it('calcula receita e trata receita inexistente', async () => {
    recipeRepo.findById.mockResolvedValueOnce(recipe);
    ingredientRepo.findByIds.mockResolvedValue([]);
    const calculated = await api('post', '/recipes/r1/calculate');
    expect(calculated.status).toBe(200);
    expect(calculated.body.data).toBeDefined();

    recipeRepo.findById.mockResolvedValueOnce(null);
    expect((await api('post', '/recipes/missing/calculate')).status).toBe(400);
  });
});
