import { CalculationResult } from '../entities/Calculation';
import { Ingredient } from '../entities/Ingredient';
import { AdditionalCost, RecipeIngredient } from '../entities/Recipe';

export interface RecipeCalculationInput {
  yield: number;
  profitMargin: number;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
}

export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  if (fromUnit === 'g'  && toUnit === 'kg') return quantity / 1000;
  if (fromUnit === 'kg' && toUnit === 'g')  return quantity * 1000;
  if (fromUnit === 'ml' && toUnit === 'l')  return quantity / 1000;
  if (fromUnit === 'l'  && toUnit === 'ml') return quantity * 1000;
  return quantity;
}

/**
 * Pure function that computes the cost + suggested price of a recipe.
 *
 * Ingredients whose id is not present in `ingredientsById` are silently
 * skipped (matches the previous behavior of CalculateRecipeUseCase).
 *
 * Preconditions enforced here:
 *  - recipe.yield must be > 0 (otherwise costPerUnit would be Infinity/NaN)
 *  - ingredient.purchaseQuantity must be > 0 for each ingredient used
 */
export function calculateRecipe(
  recipe: RecipeCalculationInput,
  ingredientsById: Map<string, Pick<Ingredient, 'id' | 'purchasePrice' | 'purchaseQuantity' | 'unit' | 'purchaseUnitWeight'>>
): CalculationResult {
  if (recipe.yield <= 0) {
    throw new Error('Recipe yield must be greater than 0');
  }

  let ingredientsCost = 0;
  for (const ri of recipe.ingredients) {
    const ingredient = ingredientsById.get(ri.ingredientId);
    if (!ingredient) continue;
    if (ingredient.purchaseQuantity <= 0) {
      throw new Error(
        `Ingredient ${ingredient.id} has invalid purchaseQuantity (must be > 0)`
      );
    }
    const effectiveQuantity = ingredient.purchaseUnitWeight
      ? ingredient.purchaseQuantity * ingredient.purchaseUnitWeight
      : ingredient.purchaseQuantity;
    const pricePerUnit = ingredient.purchasePrice / effectiveQuantity;
    const convertedQuantity = convertUnit(ri.quantityUsed, ri.unit, ingredient.unit);
    ingredientsCost += pricePerUnit * convertedQuantity;
  }

  const additionalCostTotal = recipe.additionalCosts.reduce(
    (sum, c) => sum + c.value,
    0
  );
  const totalCost = ingredientsCost + additionalCostTotal;
  const costPerUnit = totalCost / recipe.yield;
  const suggestedPrice = costPerUnit * (1 + recipe.profitMargin / 100);
  const estimatedProfit = (suggestedPrice - costPerUnit) * recipe.yield;

  return {
    totalCost,
    costPerUnit,
    suggestedPrice,
    estimatedProfit,
    profitMargin: recipe.profitMargin,
    ingredientsCost,
    additionalCostTotal,
  };
}
