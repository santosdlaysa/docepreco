import type { UserIngredient, UserRecipe, RecipeAdditionalCost, UserSubRecipe } from '../lib/api';
import { getIngredientUsageCost } from './ingredientPricing';

export function calculateAdminRecipePreview(
  rows: { ingredientId: string; quantityUsed: number; unit: string }[],
  ingredients: UserIngredient[],
  costs: RecipeAdditionalCost[],
  subRows: UserSubRecipe[],
  recipes: UserRecipe[],
  yieldValue: string,
  margin: string,
) {
    try {
      const ingredientsCost = rows.reduce((sum, row) => {
        const ingredient = ingredients.find(i => i.id === row.ingredientId);
        if (!ingredient) throw new Error('Ingrediente não encontrado.');
        return sum + getIngredientUsageCost(ingredient, Number(row.quantityUsed) || 0, row.unit);
      }, 0);
      const subRecipesCost = subRows.reduce((sum, row) => {
        const sub = recipes.find(r => r.id === row.subRecipeId);
        if (!sub) throw new Error('Receita adicionada não encontrada.');
        const quantity = Number(row.quantityUsed) || 0;
        if (quantity === 0) return sum;
        if (row.unit === 'unit' || row.unit === 'un') {
          return sum + sub.totalCost / Math.max(sub.yield || 1, 1) * quantity;
        }
        // Mesmo rendimento em g/ml usado pelo cálculo do painel administrativo.
        const baseQuantity = sub.baseQuantityProduced ?? sub.ingredients.reduce((total, item) => {
          const ing = ingredients.find(i => i.id === item.ingredientId);
          if (!ing || !['g', 'kg', 'ml', 'l'].includes(ing.unit)) return total;
          const used = item.unit === 'unit' && ing.purchaseUnitWeight
            ? item.quantityUsed * ing.purchaseUnitWeight * (['kg', 'l'].includes(ing.unit) ? 1000 : 1)
            : item.quantityUsed * (['kg', 'l'].includes(item.unit) ? 1000 : 1);
          return total + used;
        }, 0);
        if (baseQuantity <= 0) throw new Error('A receita adicionada precisa de rendimento em g/ml para usar essa medida.');
        return sum + sub.totalCost / baseQuantity * quantity * (['kg', 'l'].includes(row.unit) ? 1000 : 1);
      }, 0);
      const additionalCost = costs.reduce((sum, cost) => sum + (cost.name.trim() && cost.value > 0 ? Number(cost.value) : 0), 0);
      const totalCost = ingredientsCost + subRecipesCost + additionalCost;
      const yieldNumber = Number(yieldValue.replace(',', '.'));
      if (!(yieldNumber > 0)) throw new Error('Informe um rendimento maior que zero para calcular os valores.');
      const costPerUnit = totalCost / yieldNumber;
      const suggestedPrice = costPerUnit * (1 + (Number(margin.replace(',', '.')) || 0) / 100);
      return { ingredientsCost, subRecipesCost, additionalCost, totalCost, costPerUnit, suggestedPrice, profit: (suggestedPrice - costPerUnit) * yieldNumber };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Não foi possível calcular a receita.' };
    }

}
