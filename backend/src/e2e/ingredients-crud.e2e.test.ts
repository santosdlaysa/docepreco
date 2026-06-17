import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const ingredientRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const poolQuery = jest.fn();

jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
jest.mock('../infrastructure/repositories/PostgresIngredientRepository', () => ({
  PostgresIngredientRepository: jest.fn(() => ingredientRepo),
}));

import ingredientRoutes from '../presentation/routes/ingredientRoutes';
import { authMiddleware } from '../presentation/middleware/authMiddleware';

const JWT_SECRET = 'ingredients-crud-secret';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

const ingredient = {
  id: 'i1',
  name: 'Farinha',
  purchaseQuantity: 1000,
  purchasePrice: 5.5,
  unit: 'g',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const body = {
  name: 'Farinha',
  purchaseQuantity: 1000,
  purchasePrice: 5.5,
  unit: 'g',
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/ingredients', authMiddleware, ingredientRoutes);
  return app;
}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string) =>
  request(createApp())[method](path).set('Authorization', `Bearer ${token}`);

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

beforeEach(() => {
  for (const fn of Object.values(ingredientRepo)) fn.mockReset();
  poolQuery.mockReset();
  poolQuery.mockResolvedValue({ rows: [] });
});

describe('CRUD de ingredientes', () => {
  it('lista todos os ingredientes', async () => {
    ingredientRepo.findAll.mockResolvedValue([ingredient]);
    const res = await api('get', '/ingredients');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Farinha');
  });

  it('busca ingrediente por id', async () => {
    ingredientRepo.findById.mockResolvedValue(ingredient);
    const res = await api('get', '/ingredients/i1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('i1');
  });

  it('retorna 404 para ingrediente inexistente', async () => {
    ingredientRepo.findById.mockResolvedValue(null);
    expect((await api('get', '/ingredients/missing')).status).toBe(404);
  });

  it('cria ingrediente com dados válidos', async () => {
    ingredientRepo.findByName.mockResolvedValue(null);
    ingredientRepo.create.mockResolvedValue(ingredient);
    const res = await api('post', '/ingredients').send(body);
    expect(res.status).toBe(201);
    expect(ingredientRepo.create).toHaveBeenCalledWith(body, USER_ID);
  });

  it('rejeita ingrediente com nome vazio', async () => {
    const res = await api('post', '/ingredients').send({ ...body, name: '' });
    expect(res.status).toBe(400);
  });

  it('rejeita quantidade <= 0', async () => {
    const res = await api('post', '/ingredients').send({ ...body, purchaseQuantity: 0 });
    expect(res.status).toBe(400);
  });

  it('rejeita preço <= 0', async () => {
    const res = await api('post', '/ingredients').send({ ...body, purchasePrice: -1 });
    expect(res.status).toBe(400);
  });

  it('rejeita ingrediente duplicado', async () => {
    ingredientRepo.findByName.mockResolvedValue(ingredient);
    const res = await api('post', '/ingredients').send(body);
    expect(res.status).toBe(409);
  });

  it('atualiza ingrediente existente', async () => {
    ingredientRepo.findById.mockResolvedValue(ingredient);
    ingredientRepo.findByName.mockResolvedValue(null);
    ingredientRepo.update.mockResolvedValue({ ...ingredient, purchasePrice: 6.0 });
    const res = await api('put', '/ingredients/i1').send({ purchasePrice: 6.0 });
    expect(res.status).toBe(200);
    expect(res.body.data.purchasePrice).toBe(6.0);
  });

  it('rejeita atualização para nome já existente', async () => {
    ingredientRepo.findById.mockResolvedValue(ingredient);
    ingredientRepo.findByName.mockResolvedValue({ ...ingredient, id: 'i2' });
    ingredientRepo.update.mockRejectedValue(new Error('"Farinha" already exists'));
    const res = await api('put', '/ingredients/i1').send({ name: 'Farinha' });
    expect(res.status).toBe(409);
  });

  it('exclui ingrediente existente', async () => {
    ingredientRepo.findById.mockResolvedValue(ingredient);
    ingredientRepo.delete.mockResolvedValue(true);
    const res = await api('delete', '/ingredients/i1');
    expect(res.status).toBe(200);
  });

  it('rejeita exclusão de ingrediente inexistente', async () => {
    ingredientRepo.findById.mockResolvedValue(null);
    ingredientRepo.delete.mockRejectedValue(new Error('Ingredient not found'));
    const res = await api('delete', '/ingredients/missing');
    expect(res.status).toBe(400);
  });

  it('retorna 409 ao excluir ingrediente em uso em receitas (FK violation)', async () => {
    ingredientRepo.findById.mockResolvedValue(ingredient);
    const fkError: Error & { code?: string } = new Error('FK violation');
    fkError.code = '23503';
    ingredientRepo.delete.mockRejectedValue(fkError);
    const res = await api('delete', '/ingredients/i1');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/em uso/);
  });

  it('rejeita requisições sem token', async () => {
    const res = await request(createApp()).get('/ingredients');
    expect(res.status).toBe(401);
  });
});
