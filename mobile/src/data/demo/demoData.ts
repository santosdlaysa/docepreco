import { Ingredient } from '../../domain/entities/Ingredient';
import { Recipe } from '../../domain/entities/Recipe';
import { Sale } from '../../domain/entities/Sale';
import { CalculationResult } from '../../domain/entities/Calculation';
import { AppStats } from '../api/statsApi';
import { StoreProduct, StoreSettings } from '../../domain/entities/StoreProduct';
import { getEffectivePurchaseQuantity } from '../../domain/services/ingredientPricing';

const now = new Date().toISOString();

// ── Ingredientes ──

export const demoIngredients: Ingredient[] = [
  {
    id: 'demo-ing-1',
    name: 'Farinha de trigo',
    purchaseQuantity: 1000,
    purchasePrice: 5.90,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-ing-2',
    name: 'Chocolate em pó',
    purchaseQuantity: 400,
    purchasePrice: 12.50,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-ing-3',
    name: 'Leite condensado',
    purchaseQuantity: 395,
    purchasePrice: 6.80,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-ing-4',
    name: 'Manteiga',
    purchaseQuantity: 200,
    purchasePrice: 8.90,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-ing-5',
    name: 'Açúcar',
    purchaseQuantity: 1000,
    purchasePrice: 4.50,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-ing-6',
    name: 'Creme de leite',
    purchaseQuantity: 200,
    purchasePrice: 4.20,
    unit: 'g',
    createdAt: now,
    updatedAt: now,
  },
];

// ── Receitas ──

export const demoRecipes: Recipe[] = [
  {
    id: 'demo-rec-1',
    name: 'Brigadeiro',
    yield: 40,
    profitMargin: 100,
    ingredients: [
      { ingredientId: 'demo-ing-2', ingredientName: 'Chocolate em pó', quantityUsed: 200, unit: 'g' },
      { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
      { ingredientId: 'demo-ing-4', ingredientName: 'Manteiga', quantityUsed: 20, unit: 'g' },
    ],
    additionalCosts: [],
    subRecipes: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-rec-2',
    name: 'Bolo de Pote de Chocolate',
    yield: 10,
    profitMargin: 70,
    ingredients: [
      { ingredientId: 'demo-ing-1', ingredientName: 'Farinha de trigo', quantityUsed: 500, unit: 'g' },
      { ingredientId: 'demo-ing-2', ingredientName: 'Chocolate em pó', quantityUsed: 200, unit: 'g' },
      { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
      { ingredientId: 'demo-ing-6', ingredientName: 'Creme de leite', quantityUsed: 200, unit: 'g' },
    ],
    additionalCosts: [{ name: 'Embalagem', value: 1.50 }],
    subRecipes: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'demo-rec-3',
    name: 'Beijinho',
    yield: 30,
    profitMargin: 80,
    ingredients: [
      { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
      { ingredientId: 'demo-ing-4', ingredientName: 'Manteiga', quantityUsed: 15, unit: 'g' },
      { ingredientId: 'demo-ing-5', ingredientName: 'Açúcar', quantityUsed: 50, unit: 'g' },
    ],
    additionalCosts: [],
    subRecipes: [],
    createdAt: now,
    updatedAt: now,
  },
];

// ── Cálculos ──

function calcIngredientCost(recipe: Recipe): number {
  let total = 0;
  for (const ri of recipe.ingredients) {
    const ing = demoIngredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      total += (ri.quantityUsed / getEffectivePurchaseQuantity(ing)) * ing.purchasePrice;
    }
  }
  return total;
}

function calcRecipe(recipe: Recipe): CalculationResult {
  const ingredientsCost = calcIngredientCost(recipe);
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

export const demoCalculations: Record<string, CalculationResult> = {};
for (const r of demoRecipes) {
  demoCalculations[r.id] = calcRecipe(r);
}

// ── Vendas ──

function daysAgo(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString().split('T')[0];
}

export const demoSales: Sale[] = [
  {
    id: 'demo-sale-1',
    recipeId: 'demo-rec-1',
    recipeName: 'Brigadeiro',
    quantitySold: 40,
    salePrice: 1.50,
    totalRevenue: 60.00,
    saleDate: daysAgo(0),
    createdAt: now,
  },
  {
    id: 'demo-sale-2',
    recipeId: 'demo-rec-2',
    recipeName: 'Bolo de Pote de Chocolate',
    quantitySold: 10,
    salePrice: 12.00,
    totalRevenue: 120.00,
    saleDate: daysAgo(1),
    notes: 'Encomenda festa de aniversário',
    createdAt: now,
  },
  {
    id: 'demo-sale-3',
    recipeId: 'demo-rec-3',
    recipeName: 'Beijinho',
    quantitySold: 30,
    salePrice: 1.50,
    totalRevenue: 45.00,
    saleDate: daysAgo(2),
    createdAt: now,
  },
  {
    id: 'demo-sale-4',
    recipeId: 'demo-rec-1',
    recipeName: 'Brigadeiro',
    quantitySold: 80,
    salePrice: 1.50,
    totalRevenue: 120.00,
    saleDate: daysAgo(4),
    notes: 'Venda na feira',
    createdAt: now,
  },
  {
    id: 'demo-sale-5',
    recipeId: 'demo-rec-2',
    recipeName: 'Bolo de Pote de Chocolate',
    quantitySold: 10,
    salePrice: 13.50,
    totalRevenue: 135.00,
    saleDate: daysAgo(6),
    createdAt: now,
  },
];

// ── Stats ──

export const demoStats: AppStats = {
  recipesCount: 3,
  ingredientsCount: 6,
  monthlySalesCount: 5,
  monthlyRevenue: 480.00,
  recentSales: demoSales.slice(0, 3).map(s => ({
    id: s.id,
    recipeName: s.recipeName,
    quantitySold: s.quantitySold,
    totalRevenue: s.totalRevenue,
    saleDate: s.saleDate,
  })),
};

// ── Loja Online ──

export const demoStoreProducts: StoreProduct[] = [
  { id: 'demo-prod-1', name: 'Brigadeiro Gourmet', description: 'Caixinha com 9 unidades', publicPrice: 45.00, available: true, recipeId: 'demo-rec-1', photoUrl: undefined, createdAt: now, updatedAt: now },
  { id: 'demo-prod-2', name: 'Bolo de Pote', description: 'Sabores variados', publicPrice: 25.00, available: true, recipeId: undefined, photoUrl: undefined, createdAt: now, updatedAt: now },
  { id: 'demo-prod-3', name: 'Trufas Sortidas', description: 'Caixa com 12 unidades', publicPrice: 60.00, available: false, recipeId: undefined, photoUrl: undefined, createdAt: now, updatedAt: now },
];

export const demoStoreSettings: StoreSettings = {
  active: true,
  storeName: 'Doceria Demo',
  slug: 'doceria-demo',
  storeLink: 'https://docepreco.com/loja/doceria-demo',
  description: 'Confeitaria artesanal com produtos frescos!',
  acceptsDelivery: true,
  acceptsPickup: true,
  minOrderValue: 30,
};
