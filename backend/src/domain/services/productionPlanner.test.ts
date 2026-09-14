import { buildProductionPlan } from './productionPlanner';
import { Recipe } from '../entities/Recipe';
import { Ingredient } from '../entities/Ingredient';
import { StockItem } from '../entities/StockItem';
import type { Order } from '../../infrastructure/repositories/PostgresOrderRepository';

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({ id: 'brigadeiro', name: 'Brigadeiro', yield: 50, profitMargin: 30, ingredients: [{ ingredientId: 'chocolate', quantityUsed: 200, unit: 'g' }], additionalCosts: [], subRecipes: [], createdAt: new Date(), updatedAt: new Date(), ...overrides });
const ingredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({ id: 'chocolate', name: 'Chocolate', purchaseQuantity: 1, purchasePrice: 20, unit: 'kg', createdAt: new Date(), updatedAt: new Date(), ...overrides });
const order = (overrides: Partial<Order> = {}): Order => ({ id: 'order', userId: 'owner', clientName: 'Ana', recipeId: 'brigadeiro', recipeName: 'Brigadeiro', quantity: 100, unitPrice: 2, totalPrice: 200, deliveryDate: '2026-09-19', status: 'pending', paid: false, paidAmount: 0, payments: [], items: [], source: 'manual', createdAt: '', ...overrides });
const stock = (overrides: Partial<StockItem> = {}): StockItem => ({ id: 'stock', userId: 'owner', ingredientId: 'chocolate', quantity: 300, unit: 'g', minQuantity: 0, updatedAt: '', ...overrides });
const plan = (orders = [order()], recipes = [recipe()], ingredients = [ingredient()], inventory = [stock()]) => buildProductionPlan('2026-09-14', '2026-09-19', orders, recipes, ingredients, inventory);

describe('production planner', () => {
  it('aggregates orders, divides by yield and converts stock units before subtracting', () => {
    const result = plan([order(), order({ id: 'second', quantity: 150 })]);
    expect(result.orderCount).toBe(2);
    expect(result.products[0]).toMatchObject({ quantity: 250, batches: 5 });
    expect(result.ingredients[0]).toMatchObject({ required: 1, available: 0.3, missing: 0.7 });
    expect(result.warnings).toEqual([]);
  });
  it('uses all line items instead of double-counting the legacy summary', () => {
    const result = plan([order({ quantity: 999, items: [{ recipeId: 'brigadeiro', recipeName: 'Doce', quantity: 25, unitPrice: 2 }, { recipeId: 'brigadeiro', recipeName: 'Doce', quantity: 50, unitPrice: 2 }] })]);
    expect(result.products[0]).toMatchObject({ quantity: 75, batches: 1.5 });
    expect(result.ingredients[0].required).toBeCloseTo(0.3);
  });
  it('includes date boundaries and excludes delivered, cancelled, draft and undated orders', () => {
    const result = plan([
      order({ deliveryDate: '2026-09-14' }), order({ status: 'in_progress' }),
      ...(['done', 'delivered', 'cancelled', 'draft'] as const).map(status => order({ status })),
      order({ deliveryDate: null }), order({ deliveryDate: '2026-09-20' }), order({ deliveryDate: '2026-09-13' }),
    ]);
    expect(result.orderCount).toBe(3);
  });
  it('never infers a recipe by name and reports unknown stock', () => {
    const result = plan([order(), order({ recipeId: null })], [recipe()], [ingredient()], []);
    expect(result.products).toHaveLength(2);
    expect(result.products.find(p => p.key.startsWith('unlinked:'))?.batches).toBeNull();
    expect(result.ingredients[0]).toMatchObject({ available: null, missing: 0.4 });
    expect(result.warnings.length).toBe(2);
  });
  it('handles packaging weight and sufficient stock without negative shopping quantities', () => {
    const result = plan([order()], [recipe({ ingredients: [{ ingredientId: 'chocolate', quantityUsed: 2, unit: 'un' }] })], [ingredient({ purchaseUnitWeight: 0.395 })], [stock({ quantity: 2, unit: 'kg' })]);
    expect(result.ingredients[0]).toMatchObject({ required: 1.58, missing: 0 });
  });
  it('reports incompatible recipe and stock units instead of silently converting', () => {
    expect(plan([order()], [recipe({ ingredients: [{ ingredientId: 'chocolate', quantityUsed: 1, unit: 'ml' }] })]).warnings[0]).toContain('unidade');
    const result = plan([order()], [recipe()], [ingredient()], [stock({ unit: 'ml' })]);
    expect(result.ingredients[0].available).toBeNull();
    expect(result.ingredients[0].missing).toBe(0.4);
  });
  it('expands nested sub-recipes and accumulates shared ingredients once', () => {
    const parent = recipe({ ingredients: [], subRecipes: [{ subRecipeId: 'recheio', quantityUsed: 2, unit: 'un' }] });
    const sub = recipe({ id: 'recheio', yield: 4 });
    const result = plan([order()], [parent, sub]);
    expect(result.ingredients[0].required).toBeCloseTo(0.2);
  });
  it('uses explicit finished weight for sub-recipes and reports missing yield', () => {
    const parent = recipe({ ingredients: [], subRecipes: [{ subRecipeId: 'recheio', quantityUsed: 500, unit: 'g' }] });
    const sub = recipe({ id: 'recheio', yieldTotalWeight: 1, yieldTotalUnit: 'kg' });
    expect(plan([order()], [parent, sub]).ingredients[0].required).toBeCloseTo(0.2);
    expect(plan([order()], [parent, recipe({ id: 'recheio' })]).warnings[0]).toContain('rendimento');
  });
  it('detects cycles and invalid yields without infinite recursion or nonfinite totals', () => {
    const cyclic = recipe({ subRecipes: [{ subRecipeId: 'brigadeiro', quantityUsed: 1, unit: 'un' }] });
    expect(plan([order()], [cyclic]).warnings[0]).toContain('circular');
    const result = plan([order()], [recipe({ yield: 0 })]);
    expect(result.products[0].batches).toBeNull();
    expect(result.ingredients).toEqual([]);
  });
  it('returns an empty plan and does not mutate source data', () => {
    expect(plan([])).toMatchObject({ orderCount: 0, products: [], ingredients: [], warnings: [] });
    const orders = [order()], recipes = [recipe()], ingredients = [ingredient()], inventory = [stock()];
    const before = JSON.stringify([orders, recipes, ingredients, inventory]);
    plan(orders, recipes, ingredients, inventory);
    expect(JSON.stringify([orders, recipes, ingredients, inventory])).toBe(before);
  });
});
