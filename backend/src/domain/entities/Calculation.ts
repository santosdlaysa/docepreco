export interface CalculationResult {
  totalCost: number;
  costPerUnit: number;
  suggestedPrice: number;
  estimatedProfit: number;
  profitMargin: number;
  ingredientsCost: number;
  additionalCostTotal: number;
}

export interface CalculateRecipeDTO {
  recipeId: string;
}
