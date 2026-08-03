import { Recipe, CreateRecipeDTO } from '../../domain/entities/Recipe';
import { Ingredient, CreateIngredientDTO } from '../../domain/entities/Ingredient';
import { Sale, CreateSaleDTO } from '../../domain/entities/Sale';
import { Expense, CreateExpenseDTO } from '../api/expenseApi';
import { CalculationResult } from '../../domain/entities/Calculation';
import { AppStats } from '../api/statsApi';
import { Banner } from '../api/bannerApi';
import { getEffectivePurchaseQuantity } from '../../domain/services/ingredientPricing';
import {
  demoIngredients,
  demoRecipes,
  demoSales,
  demoStats,
  demoCalculations,
  demoStoreProducts,
  demoStoreSettings,
} from './demoData';
import { StoreAddon, StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';

// Cópias mutáveis dos arrays (reset ao sair do demo mode)
let ingredients = [...demoIngredients];
let recipes = [...demoRecipes];
let sales = [...demoSales];

const demoExpenses: Expense[] = [
  { id: 'demo-exp-1', description: 'Aluguel do espaço', amount: 600, category: 'aluguel', costType: 'fixed', isRecurring: true, recurrenceDay: 5, expenseDate: new Date().toISOString().slice(0, 8) + '05', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'demo-exp-2', description: 'Energia elétrica', amount: 150, category: 'energia', costType: 'fixed', isRecurring: true, recurrenceDay: 10, expenseDate: new Date().toISOString().slice(0, 8) + '10', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'demo-exp-3', description: 'Embalagens personalizadas', amount: 85, category: 'embalagem', costType: 'variable', isRecurring: false, recurrenceDay: null, expenseDate: new Date().toISOString().slice(0, 8) + '03', notes: 'Caixas para brigadeiros gourmet', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'demo-exp-4', description: 'Instagram Ads', amount: 120, category: 'marketing', costType: 'variable', isRecurring: false, recurrenceDay: null, expenseDate: new Date().toISOString().slice(0, 8) + '01', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
let demoExpensesMutable = [...demoExpenses];
let nextId = 100;

const genId = () => `demo-gen-${nextId++}`;
const now = () => new Date().toISOString();
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ── Stats ──

export const demoStatsApi = {
  getStats: async (): Promise<AppStats> => {
    await delay();
    return {
      ...demoStats,
      recipesCount: recipes.length,
      ingredientsCount: ingredients.length,
      monthlySalesCount: sales.length,
      monthlyRevenue: sales.reduce((s, v) => s + v.totalRevenue, 0),
      recentSales: sales.slice(0, 3).map(s => ({
        id: s.id,
        recipeName: s.recipeName,
        quantitySold: s.quantitySold,
        totalRevenue: s.totalRevenue,
        saleDate: s.saleDate,
      })),
    };
  },
};

// ── Banners ──

export const demoBannerApi = {
  getActive: async (): Promise<Banner[]> => {
    await delay();
    return [
      {
        id: 'demo-banner-1',
        title: 'Modo Demonstração',
        message: 'Explore todas as funcionalidades do app com dados fictícios!',
        type: 'info' as const,
        actionUrl: null,
        startsAt: new Date().toISOString(),
        endsAt: null,
        isActive: true,
      },
    ];
  },
};

// ── Tips ──

export const demoTipApi = {
  getActive: async () => {
    await delay();
    return [
      { id: 'demo-tip-1', message: 'Dica: revise seus preços a cada 15 dias para acompanhar a variação dos ingredientes!', isActive: true, createdAt: new Date().toISOString() },
      { id: 'demo-tip-2', message: 'Você sabia? Embalar bem seus doces pode aumentar o valor percebido em até 30%!', isActive: true, createdAt: new Date().toISOString() },
      { id: 'demo-tip-3', message: 'Lembre-se: seu tempo também é um ingrediente! Não esqueça de incluir a mão de obra.', isActive: true, createdAt: new Date().toISOString() },
    ];
  },
};

// ── Notification Templates ──

export const demoNotificationTemplateApi = {
  getActive: async () => {
    await delay();
    return [
      { id: 'demo-nt-1', slug: 'inactivity_2d', title: 'Sentimos sua falta! 🧁', body: 'Suas receitas estão te esperando! Abra o DocePreço e confira seus cálculos.', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-nt-2', slug: 'inactivity_5d', title: 'Faz tempo! 🍰', body: 'Faz tempo que você não aparece! Seus doces precisam de preços atualizados.', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-nt-3', slug: 'daily_sales', title: 'Hora do registro! 📝', body: 'Já registrou as vendas de hoje? Mantenha seu controle em dia!', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-nt-4', slug: 'weekly_reminder', title: 'Começo de semana! 📊', body: 'Confira se os preços dos ingredientes mudaram. Manter tudo atualizado é o segredo!', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
  },
};

// ── Recipes ──

function calculateForRecipe(recipe: Recipe): CalculationResult {
  let ingredientsCost = 0;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      ingredientsCost += (ri.quantityUsed / getEffectivePurchaseQuantity(ing)) * ing.purchasePrice;
    }
  }
  const additionalCostTotal = recipe.additionalCosts.reduce((s, c) => s + c.value, 0);
  const totalCost = ingredientsCost + additionalCostTotal;
  const costPerUnit = totalCost / recipe.yield;
  const suggestedPrice = costPerUnit * (1 + recipe.profitMargin / 100);
  const estimatedProfit = (suggestedPrice - costPerUnit) * recipe.yield;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMargin: recipe.profitMargin,
    ingredientsCost: Math.round(ingredientsCost * 100) / 100,
    additionalCostTotal: Math.round(additionalCostTotal * 100) / 100,
    subRecipesCost: 0,
  };
}

export const demoRecipeApi = {
  getAll: async (): Promise<Recipe[]> => {
    await delay();
    return [...recipes];
  },

  getById: async (id: string): Promise<Recipe> => {
    await delay();
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) throw new Error('Receita não encontrada');
    return { ...recipe };
  },

  create: async (data: CreateRecipeDTO): Promise<Recipe> => {
    await delay();
    const recipe: Recipe = {
      id: genId(),
      ...data,
      createdAt: now(),
      updatedAt: now(),
    };
    recipes.push(recipe);
    return { ...recipe };
  },

  update: async (id: string, data: Partial<CreateRecipeDTO>): Promise<Recipe> => {
    await delay();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Receita não encontrada');
    recipes[idx] = { ...recipes[idx], ...data, updatedAt: now() };
    return { ...recipes[idx] };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    recipes = recipes.filter(r => r.id !== id);
  },

  calculate: async (id: string): Promise<CalculationResult> => {
    await delay();
    // Use pre-calculated if available, otherwise calculate on the fly
    if (demoCalculations[id]) return { ...demoCalculations[id] };
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) throw new Error('Receita não encontrada');
    return calculateForRecipe(recipe);
  },
};

// ── Ingredients ──

export const demoIngredientApi = {
  getAll: async (): Promise<Ingredient[]> => {
    await delay();
    return [...ingredients];
  },

  getById: async (id: string): Promise<Ingredient> => {
    await delay();
    const ing = ingredients.find(i => i.id === id);
    if (!ing) throw new Error('Ingrediente não encontrado');
    return { ...ing };
  },

  create: async (data: CreateIngredientDTO): Promise<Ingredient> => {
    await delay();
    const ingredient: Ingredient = {
      id: genId(),
      ...data,
      createdAt: now(),
      updatedAt: now(),
    };
    ingredients.push(ingredient);
    return { ...ingredient };
  },

  update: async (id: string, data: Partial<CreateIngredientDTO>): Promise<Ingredient> => {
    await delay();
    const idx = ingredients.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Ingrediente não encontrado');
    ingredients[idx] = { ...ingredients[idx], ...data, updatedAt: now() };
    return { ...ingredients[idx] };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    const usedInRecipe = recipes.some(r => r.ingredients.some(ri => ri.ingredientId === id));
    if (usedInRecipe) throw new Error('Ingrediente em uso em uma ou mais receitas');
    ingredients = ingredients.filter(i => i.id !== id);
  },
};

// ── Sales ──

export const demoSaleApi = {
  getAll: async (period?: 'week' | 'month'): Promise<Sale[]> => {
    await delay();
    if (!period) return [...sales];
    const now = new Date();
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else cutoff.setMonth(now.getMonth() - 1);
    return sales.filter(s => new Date(s.saleDate) >= cutoff);
  },

  create: async (data: CreateSaleDTO): Promise<Sale> => {
    await delay();
    const recipe = data.recipeId ? recipes.find(r => r.id === data.recipeId) : null;
    const discount = data.discount ?? 0;
    const sale: Sale = {
      id: genId(),
      recipeId: data.recipeId,
      recipeName: recipe?.name || data.productName || 'Produto',
      quantitySold: data.quantitySold,
      salePrice: data.salePrice,
      totalRevenue: data.quantitySold * data.salePrice - discount,
      discount,
      saleDate: data.saleDate,
      clientName: data.clientName ?? null,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      createdAt: now(),
    };
    sales.unshift(sale);
    return { ...sale };
  },

  update: async (id: string, data: CreateSaleDTO): Promise<Sale> => {
    await delay();
    const idx = sales.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Venda não encontrada');
    const recipe = data.recipeId ? recipes.find(r => r.id === data.recipeId) : null;
    const discount = data.discount ?? 0;
    const updated: Sale = {
      ...sales[idx],
      recipeId: data.recipeId,
      recipeName: recipe?.name || data.productName || sales[idx].recipeName,
      quantitySold: data.quantitySold,
      salePrice: data.salePrice,
      totalRevenue: data.quantitySold * data.salePrice - discount,
      discount,
      saleDate: data.saleDate,
      clientName: data.clientName ?? null,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
    };
    sales[idx] = updated;
    return { ...updated };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    sales = sales.filter(s => s.id !== id);
  },
};

// ── Expenses ──

export const demoExpenseApi = {
  getAll: async (month?: string): Promise<Expense[]> => {
    await delay();
    if (!month) return [...demoExpensesMutable];
    return demoExpensesMutable.filter(e => e.expenseDate.slice(0, 7) === month);
  },

  create: async (data: CreateExpenseDTO): Promise<Expense> => {
    await delay();
    const expense: Expense = {
      id: genId(),
      description: data.description,
      amount: data.amount,
      category: data.category,
      costType: data.costType,
      isRecurring: data.isRecurring,
      recurrenceDay: data.recurrenceDay ?? null,
      expenseDate: data.expenseDate,
      notes: data.notes ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    demoExpensesMutable.unshift(expense);
    return { ...expense };
  },

  update: async (id: string, data: Partial<CreateExpenseDTO>): Promise<Expense> => {
    await delay();
    const idx = demoExpensesMutable.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Despesa não encontrada');
    demoExpensesMutable[idx] = { ...demoExpensesMutable[idx], ...data, updatedAt: now() };
    return { ...demoExpensesMutable[idx] };
  },

  delete: async (id: string): Promise<void> => {
    await delay();
    demoExpensesMutable = demoExpensesMutable.filter(e => e.id !== id);
  },

  getSummary: async (month: string) => {
    await delay();
    const filtered = demoExpensesMutable.filter(e => e.expenseDate.slice(0, 7) === month);
    const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
    const byCategory = Object.entries(
      filtered.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      }, {})
    ).map(([category, total]) => ({ category, total }));
    return { totalExpenses, byCategory };
  },
};

// ── Loja Online ──

let storeProducts = [...demoStoreProducts];
let storeSettings = { ...demoStoreSettings };
let storeAddons: StoreAddon[] = [
  { id: 'demo-addon-1', name: 'Cobertura extra', price: 3, available: true, createdAt: now(), updatedAt: now() },
  { id: 'demo-addon-2', name: 'Embalagem para presente', price: 5, available: true, createdAt: now(), updatedAt: now() },
];

export const demoStoreApi = {
  getProducts: async (): Promise<StoreProduct[]> => {
    await delay();
    return [...storeProducts];
  },
  createProduct: async (data: Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoreProduct> => {
    await delay();
    const p: StoreProduct = { ...data, id: genId(), createdAt: now(), updatedAt: now() };
    storeProducts.push(p);
    return p;
  },
  updateProduct: async (id: string, data: Partial<Omit<StoreProduct, 'id' | 'createdAt' | 'updatedAt'>>): Promise<StoreProduct> => {
    await delay();
    storeProducts = storeProducts.map(p => p.id === id ? { ...p, ...data, updatedAt: now() } : p);
    return storeProducts.find(p => p.id === id)!;
  },
  deleteProduct: async (id: string): Promise<void> => {
    await delay();
    storeProducts = storeProducts.filter(p => p.id !== id);
  },
  getSettings: async (): Promise<StoreSettings> => {
    await delay();
    return { ...storeSettings };
  },
  updateSettings: async (data: Partial<StoreSettings>): Promise<StoreSettings> => {
    await delay();
    storeSettings = { ...storeSettings, ...data };
    return { ...storeSettings };
  },
  getAddons: async (): Promise<StoreAddon[]> => {
    await delay();
    return [...storeAddons];
  },
  createAddon: async (data: Pick<StoreAddon, 'name' | 'price'> & Partial<Pick<StoreAddon, 'available'>>): Promise<StoreAddon> => {
    await delay();
    const a: StoreAddon = { id: genId(), name: data.name, price: data.price, available: data.available !== false, createdAt: now(), updatedAt: now() };
    storeAddons.push(a);
    return a;
  },
  updateAddon: async (id: string, data: Partial<Pick<StoreAddon, 'name' | 'price' | 'available'>>): Promise<StoreAddon> => {
    await delay();
    storeAddons = storeAddons.map(a => a.id === id ? { ...a, ...data, updatedAt: now() } : a);
    return storeAddons.find(a => a.id === id)!;
  },
  deleteAddon: async (id: string): Promise<void> => {
    await delay();
    storeAddons = storeAddons.filter(a => a.id !== id);
  },
};
