export interface CalculationResult {
  totalCost: number;
  costPerUnit: number;
  suggestedPrice: number;
  estimatedProfit: number;
  /** Legacy field name: percentage markup on cost, not margin on selling price. */
  profitMargin: number;
  ingredientsCost: number;
  additionalCostTotal: number;
  subRecipesCost: number;
}
