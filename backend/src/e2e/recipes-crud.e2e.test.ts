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
  function expiredPlan() {
    userRepo.findById.mockResolvedValue({ isPremium: true, premiumUntil: '2020-01-01' });
    poolQuery.mockImplementation((sql: string) => Promise.resolve({ rows:
      sql.includes('OFFSET $2') ? [{ id: 'r4' }] :
      sql.includes('plan_free_recipe_limit') ? [{ value: '3' }] : []
    }));
  }

  it('mantém excedentes visíveis, inativos e sem o conteúdo quando o plano vence', async () => {
    expiredPlan();
    recipeRepo.findAll.mockResolvedValue([recipe, { ...recipe, id: 'r4', ingredients: [{ ingredientId: 'i1' }] }]);
    const res = await api('get', '/recipes');
    expect(res.status).toBe(200);
    expect(res.body.data[0].isActive).toBe(true);
    expect(res.body.data[1]).toMatchObject({ id: 'r4', isActive: false, ingredients: [] });
    expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at ASC, id ASC OFFSET $2'), [USER_ID, 3]);
  });

  it.each(['get', 'put', 'post'] as const)('bloqueia acesso direto a receita inativa: %s', async method => {
    expiredPlan();
    const res = await api(method, method === 'post' ? '/recipes/r4/calculate' : '/recipes/r4').send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RECIPE_INACTIVE');
    expect(recipeRepo.findById).not.toHaveBeenCalled();
    expect(recipeRepo.update).not.toHaveBeenCalled();
  });

  it('impede usar receita inativa como sub-receita', async () => {
    expiredPlan();
    const res = await api('put', '/recipes/r1').send({ ...body, subRecipes: [{ subRecipeId: 'r4' }] });
    expect(res.status).toBe(403);
    expect(recipeRepo.update).not.toHaveBeenCalled();
  });

  it('libera todas as receitas automaticamente após renovar', async () => {
    expiredPlan();
    userRepo.findById.mockResolvedValue({ isPremium: true, premiumUntil: '2099-01-01' });
    recipeRepo.findAll.mockResolvedValue([{ ...recipe, id: 'r4' }]);
    recipeRepo.findById.mockResolvedValue({ ...recipe, id: 'r4' });
    const list = await api('get', '/recipes');
    expect(list.body.data[0].isActive).toBe(true);
    expect((await api('get', '/recipes/r4')).status).toBe(200);
    expect(poolQuery.mock.calls.some(([sql]) => sql.includes('OFFSET $2'))).toBe(false);
  });

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
