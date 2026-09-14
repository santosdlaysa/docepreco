import { Recipe } from '../entities/Recipe';
import { Ingredient } from '../entities/Ingredient';
import { StockItem } from '../entities/StockItem';
import type { Order } from '../../infrastructure/repositories/PostgresOrderRepository';
import { convertUnit } from './recipeCalculator';

export interface ProductionPlan {
  start: string;
  end: string;
  orderCount: number;
  products: { key: string; name: string; quantity: number; batches: number | null }[];
  ingredients: { id: string; name: string; unit: string; required: number; available: number | null; missing: number }[];
  warnings: string[];
}

const unit = (value: string) => value === 'un' ? 'unit' : value.toLowerCase();
const positive = (value: number) => Number.isFinite(value) && value > 0;

/** Read-only plan: fractional batches, no stock reservation or deduction. */
export function buildProductionPlan(start: string, end: string, orders: Order[], recipes: Recipe[], ingredients: Ingredient[], stock: StockItem[]): ProductionPlan {
  const warnings = new Set<string>();
  const recipeMap = new Map(recipes.map(r => [r.id, r]));
  const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  const stockMap = new Map(stock.map(s => [s.ingredientId, s]));
  const products = new Map<string, ProductionPlan['products'][number]>();
  const required = new Map<string, number>();
  // Pedidos prontos (done) ainda fazem parte da fila operacional até a entrega;
  // a tela antiga de produção já os exibia. Somente entregues/cancelados e rascunhos saem.
  const selected = orders.filter(o => ['pending', 'in_progress', 'done'].includes(o.status) && o.deliveryDate && o.deliveryDate >= start && o.deliveryDate <= end);

  const expand = (recipe: Recipe, batches: number, path: Set<string>) => {
    if (path.has(recipe.id) || path.size >= 30) {
      warnings.add(`Revise as sub-receitas de ${recipe.name}: vínculo circular ou profundidade excessiva.`);
      return;
    }
    const next = new Set(path).add(recipe.id);
    if (!recipe.ingredients.length && !recipe.subRecipes.length) warnings.add(`${recipe.name}: receita sem ingredientes cadastrados.`);
    for (const item of recipe.ingredients) {
      const ingredient = ingredientMap.get(item.ingredientId);
      if (!ingredient) { warnings.add(`${recipe.name}: ingrediente não encontrado.`); continue; }
      try {
        if (!positive(item.quantityUsed)) throw new Error();
        const amount = unit(item.unit) === 'unit' && unit(ingredient.unit) !== 'unit' && positive(ingredient.purchaseUnitWeight ?? 0)
          ? item.quantityUsed * ingredient.purchaseUnitWeight!
          : convertUnit(item.quantityUsed, unit(item.unit), unit(ingredient.unit));
        if (!positive(amount * batches)) throw new Error();
        required.set(ingredient.id, (required.get(ingredient.id) ?? 0) + amount * batches);
      } catch { warnings.add(`${recipe.name}: confira quantidade e unidade de ${ingredient.name}.`); }
    }
    for (const item of recipe.subRecipes) {
      const sub = recipeMap.get(item.subRecipeId);
      if (!sub) { warnings.add(`${recipe.name}: sub-receita não encontrada.`); continue; }
      try {
        if (!positive(item.quantityUsed)) throw new Error();
        let count: number;
        if (unit(item.unit) === 'unit') {
          if (!positive(sub.yield)) throw new Error();
          count = item.quantityUsed / sub.yield;
        } else {
          // Use an explicit finished yield; raw ingredient mass can lose weight during cooking.
          if (!positive(sub.yieldTotalWeight ?? 0) || !sub.yieldTotalUnit) throw new Error();
          count = convertUnit(item.quantityUsed, unit(item.unit), sub.yieldTotalUnit) / sub.yieldTotalWeight!;
        }
        if (!positive(count * batches)) throw new Error();
        expand(sub, count * batches, next);
      } catch { warnings.add(`${recipe.name}: confira o rendimento e a unidade da sub-receita ${sub.name}.`); }
    }
  };

  for (const order of selected) {
    const items = order.items?.length ? order.items : [order];
    for (const item of items) {
      if ('addons' in item && Array.isArray(item.addons) && item.addons.length) warnings.add(`${item.recipeName}: adicionais do pedido de ${order.clientName} precisam ser conferidos separadamente.`);
      if (!positive(item.quantity)) { warnings.add(`${order.clientName}: item com quantidade inválida.`); continue; }
      const recipe = item.recipeId ? recipeMap.get(item.recipeId) : undefined;
      const key = item.recipeId || `unlinked:${item.recipeName}`;
      const product = products.get(key) ?? { key, name: recipe?.name ?? item.recipeName, quantity: 0, batches: null };
      product.quantity += item.quantity;
      if (recipe && positive(recipe.yield)) product.batches = product.quantity / recipe.yield;
      else warnings.add(`${product.name}: vincule uma receita com rendimento válido para calcular os ingredientes.`);
      products.set(key, product);
    }
  }
  for (const product of products.values()) {
    const recipe = recipeMap.get(product.key);
    if (recipe && product.batches !== null) expand(recipe, product.batches, new Set());
  }
  const rows = [...required].map(([id, amount]) => {
    const ingredient = ingredientMap.get(id)!;
    const entry = stockMap.get(id);
    let available: number | null = null;
    try {
      if (entry && Number.isFinite(entry.quantity)) available = Math.max(0, convertUnit(entry.quantity, unit(entry.unit), unit(ingredient.unit)));
    } catch { /* Unknown balance is shown explicitly and never counted as available. */ }
    if (available === null) warnings.add(`${ingredient.name}: estoque não informado ou unidade incompatível; confira antes de comprar.`);
    return { id, name: ingredient.name, unit: ingredient.unit, required: amount, available, missing: Math.max(0, amount - (available ?? 0)) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { start, end, orderCount: selected.length, products: [...products.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), ingredients: rows, warnings: [...warnings] };
}
