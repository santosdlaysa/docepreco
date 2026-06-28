import { CalculationResult } from '../entities/Calculation';
import { Ingredient } from '../entities/Ingredient';
import { AdditionalCost, RecipeIngredient, SubRecipe } from '../entities/Recipe';

export interface SubRecipeCostInfo {
  subRecipeId: string;
  costPerUnit: number;
  totalCost?: number;
  baseQuantityProduced?: number;
}

export interface RecipeCalculationInput {
  yield: number;
  profitMargin: number;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes?: SubRecipe[];
}

export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  if (fromUnit === 'g'  && toUnit === 'kg') return quantity / 1000;
  if (fromUnit === 'kg' && toUnit === 'g')  return quantity * 1000;
  if (fromUnit === 'ml' && toUnit === 'l')  return quantity / 1000;
  if (fromUnit === 'l'  && toUnit === 'ml') return quantity * 1000;
  throw new Error(`Cannot convert ${fromUnit} to ${toUnit}`);
}

export function normalizeToBaseMeasure(quantity: number, unit: string): number | undefined {
  if (unit === 'g' || unit === 'ml') return quantity;
  if (unit === 'kg' || unit === 'l') return quantity * 1000;
  return undefined;
}

function convertSubRecipeQuantity(quantity: number, unit: string, info: SubRecipeCostInfo): number {
  if (unit === 'un' || unit === 'unit') return info.costPerUnit * quantity;

  const totalCost = info.totalCost ?? info.costPerUnit;
  const baseQuantityProduced = info.baseQuantityProduced ?? 0;
  const baseQuantityUsed = normalizeToBaseMeasure(quantity, unit);
  if (baseQuantityUsed === undefined) {
    throw new Error(`Cannot calculate sub-recipe cost for unit ${unit}`);
  }
  if (baseQuantityProduced <= 0) {
    throw new Error('Sub-recipe does not have a measurable yield in g/ml');
  }

  return (totalCost / baseQuantityProduced) * baseQuantityUsed;
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
  ingredientsById: Map<string, Pick<Ingredient, 'id' | 'purchasePrice' | 'purchaseQuantity' | 'unit' | 'purchaseUnitWeight'>>,
  subRecipeCosts?: SubRecipeCostInfo[]
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
    const convertedQuantity =
      ri.unit === 'unit' && ingredient.purchaseUnitWeight && ingredient.unit !== 'unit'
        ? ri.quantityUsed * ingredient.purchaseUnitWeight
        : convertUnit(ri.quantityUsed, ri.unit, ingredient.unit);
    ingredientsCost += pricePerUnit * convertedQuantity;
  }

  let subRecipesCost = 0;
  if (recipe.subRecipes && subRecipeCosts) {
    const costMap = new Map(subRecipeCosts.map(s => [s.subRecipeId, s]));
    for (const sub of recipe.subRecipes) {
      const subRecipeCost = costMap.get(sub.subRecipeId);
      if (subRecipeCost !== undefined) {
        subRecipesCost += convertSubRecipeQuantity(sub.quantityUsed, sub.unit, subRecipeCost);
      }
    }
  }

  const additionalCostTotal = recipe.additionalCosts.reduce(
    (sum, c) => sum + c.value,
    0
  );
  const totalCost = ingredientsCost + additionalCostTotal + subRecipesCost;
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
    subRecipesCost,
  };
}
