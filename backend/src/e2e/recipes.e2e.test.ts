import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'recipes-e2e-secret';

// ── Mock do pool de banco ───────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('../infrastructure/database/connection', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

// Evita carregar expo-server-sdk (ESM) via cadeia referralService → pushService
jest.mock('../infrastructure/services/referralService', () => ({
  processReferralActivation: jest.fn().mockResolvedValue(undefined),
}));

import recipeRoutes from '../presentation/routes/recipeRoutes';
import { authMiddleware } from '../presentation/middleware/authMiddleware';

// ── App setup ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/recipes', recipeRoutes);
  return app;
}

const USER_ID = '11111111-1111-1111-1111-111111111111';
const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

beforeEach(() => {
  mockQuery.mockReset();
});

describe('GET /recipes (E2E)', () => {
  it('monta as receitas com suas relações agrupadas corretamente', async () => {
    const recipes = [
      { id: 'r1', name: 'Bolo', yield: 10, profit_margin: '30.00', photo_url: null, created_at: new Date(), updated_at: new Date() },
      { id: 'r2', name: 'Torta', yield: 8, profit_margin: '40.00', photo_url: null, created_at: new Date(), updated_at: new Date() },
    ];

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('UPDATE users SET last_seen_at')) return Promise.resolve({ rows: [] });
      if (sql.includes('FROM recipes WHERE user_id')) return Promise.resolve({ rows: recipes });
      if (sql.includes('recipe_ingredients')) {
        return Promise.resolve({ rows: [
          { recipe_id: 'r1', ingredient_id: 'i1', ingredient_name: 'Farinha', quantity_used: '2.000', unit: 'kg' },
          { recipe_id: 'r1', ingredient_id: 'i2', ingredient_name: 'Açúcar', quantity_used: '1.000', unit: 'kg' },
          { recipe_id: 'r2', ingredient_id: 'i3', ingredient_name: 'Ovo', quantity_used: '6.000', unit: 'un' },
        ] });
      }
      if (sql.includes('recipe_additional_costs')) {
        return Promise.resolve({ rows: [
          { recipe_id: 'r1', name: 'Gás', value: '5.00' },
        ] });
      }
      if (sql.includes('recipe_sub_recipes')) {
        return Promise.resolve({ rows: [
          { recipe_id: 'r2', sub_recipe_id: 'r1', sub_recipe_name: 'Bolo', quantity_used: '1.000', unit: 'un' },
        ] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(createApp())
      .get('/recipes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const bolo = res.body.data.find((r: { id: string }) => r.id === 'r1');
    const torta = res.body.data.find((r: { id: string }) => r.id === 'r2');

    expect(bolo.ingredients).toHaveLength(2);
    expect(bolo.ingredients[0]).toMatchObject({ ingredientId: 'i1', ingredientName: 'Farinha', quantityUsed: 2, unit: 'kg' });
    expect(bolo.additionalCosts).toEqual([{ name: 'Gás', value: 5 }]);
    expect(bolo.subRecipes).toHaveLength(0);

    expect(torta.ingredients).toHaveLength(1);
    expect(torta.additionalCosts).toHaveLength(0);
    expect(torta.subRecipes).toEqual([{ subRecipeId: 'r1', subRecipeName: 'Bolo', quantityUsed: 1, unit: 'un' }]);
  });

  it('não dispara N+1: o número de queries de relação é constante (1 por tabela), independente da quantidade de receitas', async () => {
    const recipes = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`, name: `Receita ${i}`, yield: 1, profit_margin: '30.00', photo_url: null, created_at: new Date(), updated_at: new Date(),
    }));

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM recipes WHERE user_id')) return Promise.resolve({ rows: recipes });
      return Promise.resolve({ rows: [] });
    });

    await request(createApp()).get('/recipes').set('Authorization', `Bearer ${token}`);

    const calls = mockQuery.mock.calls.map(c => c[0] as string);
    const count = (needle: string) => calls.filter(s => s.includes(needle)).length;

    // Antes da correção isto seria 5 (uma por receita). Agora deve ser exatamente 1.
    expect(count('recipe_ingredients')).toBe(1);
    expect(count('recipe_additional_costs')).toBe(1);
    expect(count('recipe_sub_recipes')).toBe(1);
    // E a query de ingredientes deve usar carregamento em lote (ANY).
    const ingQuery = calls.find(s => s.includes('recipe_ingredients'))!;
    expect(ingQuery).toContain('ANY($1)');
  });

  it('retorna lista vazia sem consultar relações quando o usuário não tem receitas', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM recipes WHERE user_id')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(createApp()).get('/recipes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    const calls = mockQuery.mock.calls.map(c => c[0] as string);
    expect(calls.filter(s => s.includes('recipe_ingredients'))).toHaveLength(0);
  });
});
