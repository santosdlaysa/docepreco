import type { Ingredient, Recipe } from './userApi';
import { getIngredientUsageCost } from './ingredientPricing';

/** Mirrors CalculateRecipeUseCase: direct ingredients and additional costs of each sub-recipe. */
export function getSubRecipeUsageCost(recipe: Recipe, ingredients: Ingredient[], quantity: number, unit: string): number {
  if (quantity === 0) return 0;
  let totalCost = recipe.additionalCosts.reduce((sum, cost) => sum + cost.value * (cost.costType === 'unit' ? recipe.yield : 1), 0);
  let baseQuantity = 0;
  for (const row of recipe.ingredients) {
    const ingredient = ingredients.find(item => item.id === row.ingredientId);
    if (!ingredient) throw new Error('Ingrediente da sub-receita não encontrado.');
    totalCost += getIngredientUsageCost(ingredient, row.quantityUsed, row.unit);
    if (row.unit === 'unit' && ingredient.purchaseUnitWeight) {
      if (['g', 'kg', 'ml', 'l'].includes(ingredient.unit)) {
        baseQuantity += row.quantityUsed * ingredient.purchaseUnitWeight * (['kg', 'l'].includes(ingredient.unit) ? 1000 : 1);
      }
    } else if (['g', 'kg', 'ml', 'l'].includes(row.unit)) {
      baseQuantity += row.quantityUsed * (['kg', 'l'].includes(row.unit) ? 1000 : 1);
    }
  }
  if (unit === 'unit' || unit === 'un') {
    if (!(recipe.yield > 0)) throw new Error('Sub-receita sem rendimento válido.');
    return totalCost / recipe.yield * quantity;
  }
  if (!['g', 'kg', 'ml', 'l'].includes(unit) || baseQuantity <= 0) {
    throw new Error('A sub-receita precisa de rendimento em g/ml para essa medida.');
  }
  return totalCost / baseQuantity * quantity * (['kg', 'l'].includes(unit) ? 1000 : 1);
}
