import { userApi, Recipe, Ingredient } from './userApi';
import { convertUnitOrNull } from './units';

/**
 * Baixa automática de estoque ao vender/entregar — mesma regra do app
 * (mobile/src/data/stock/stockStorage.ts → computeUsageForSale). O consumo é
 * calculado no cliente (sub-receitas recursivas + conversão de unidade) e o
 * backend só aplica: ingredientes sem controle de estoque são ignorados.
 * Tudo é best-effort: falha de estoque nunca impede registrar a venda.
 */

// Unidades incompatíveis ou 'unit' → mantém o valor (mesma regra do app).
const convertUnit = (qty: number, from: string, to: string): number => convertUnitOrNull(qty, from, to) ?? qty;

function accumulateUsage(
  recipe: Recipe,
  recipeById: Map<string, Recipe>,
  unitById: Map<string, string>,
  scale: number,
  out: Record<string, number>,
  depth: number,
): void {
  if (depth > 6) return; // proteção contra sub-receitas cíclicas
  for (const ing of recipe.ingredients ?? []) {
    const target = unitById.get(ing.ingredientId) ?? ing.unit;
    out[ing.ingredientId] = (out[ing.ingredientId] ?? 0) + convertUnit(ing.quantityUsed, ing.unit, target) * scale;
  }
  for (const sub of recipe.subRecipes ?? []) {
    const subRecipe = recipeById.get(sub.subRecipeId);
    if (!subRecipe || !subRecipe.yield) continue;
    accumulateUsage(subRecipe, recipeById, unitById, scale * (sub.quantityUsed / subRecipe.yield), out, depth + 1);
  }
}

/** Consumo (na unidade de cada ingrediente) ao vender `quantity` unidades da receita. */
export function computeUsageForSale(recipe: Recipe, allRecipes: Recipe[], ingredients: Ingredient[], quantity: number): Record<string, number> {
  if (!recipe.yield) return {};
  const perBatch: Record<string, number> = {};
  accumulateUsage(recipe, new Map(allRecipes.map(r => [r.id, r])), new Map(ingredients.map(i => [i.id, i.unit])), 1, perBatch, 0);
  const scale = quantity / recipe.yield;
  return Object.fromEntries(Object.entries(perBatch).map(([id, q]) => [id, q * scale]));
}

export interface SoldItem {
  recipeId?: string | null;
  recipeName?: string;
  quantity: number;
}

const findRecipe = (recipes: Recipe[], item: SoldItem) =>
  (item.recipeId ? recipes.find(r => r.id === item.recipeId) : undefined)
  ?? (item.recipeName ? recipes.find(r => r.name.trim().toLowerCase() === item.recipeName!.trim().toLowerCase()) : undefined);

/** Dá baixa dos itens vendidos. Retorna os nomes dos ingredientes que ficaram baixos. */
export async function deductStockForItems(items: SoldItem[], reasonPrefix = 'Venda'): Promise<string[]> {
  try {
    const [recipes, ingredients] = await Promise.all([userApi.listRecipes(), userApi.listIngredients()]);
    const deductions: { ingredientId: string; quantity: number; reason: string }[] = [];
    for (const item of items) {
      const recipe = findRecipe(recipes, item);
      if (!recipe) continue; // produto avulso: sem ficha técnica
      for (const [ingredientId, quantity] of Object.entries(computeUsageForSale(recipe, recipes, ingredients, item.quantity))) {
        if (quantity > 0) deductions.push({ ingredientId, quantity, reason: `${reasonPrefix} · ${recipe.name}` });
      }
    }
    if (deductions.length === 0) return [];
    const { lowStock } = await userApi.deductStock(deductions);
    const nameById = new Map(ingredients.map(i => [i.id, i.name]));
    return lowStock.map(l => nameById.get(l.ingredientId) ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Estorna a baixa de uma venda (ao editar: estorna o antigo e reaplica o novo).
 * Só devolve para ingredientes já controlados, para não criar controle novo.
 */
export async function reverseStockForItems(items: SoldItem[]): Promise<void> {
  try {
    const [recipes, ingredients, stock] = await Promise.all([userApi.listRecipes(), userApi.listIngredients(), userApi.getStock()]);
    const tracked = new Set(stock.items.map(i => i.ingredientId));
    const ingById = new Map(ingredients.map(i => [i.id, i]));
    for (const item of items) {
      const recipe = findRecipe(recipes, item);
      if (!recipe) continue;
      for (const [ingredientId, quantity] of Object.entries(computeUsageForSale(recipe, recipes, ingredients, item.quantity))) {
        const ing = ingById.get(ingredientId);
        if (!ing || quantity <= 0 || !tracked.has(ingredientId)) continue;
        await userApi.addStockEntry(ingredientId, quantity, ing.unit, `Estorno edição · ${recipe.name}`).catch(() => {});
      }
    }
  } catch { /* best-effort */ }
}
