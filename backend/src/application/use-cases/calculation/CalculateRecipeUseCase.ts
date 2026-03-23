import { CalculationResult } from '../../../domain/entities/Calculation';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';

export class CalculateRecipeUseCase {
  constructor(
    private recipeRepository: IRecipeRepository,
    private ingredientRepository: IIngredientRepository
  ) {}

  async execute(recipeId: string, userId: string): Promise<CalculationResult> {
    const recipe = await this.recipeRepository.findById(recipeId, userId);
    if (!recipe) throw new Error('Recipe not found');

    const ingredientIds = recipe.ingredients.map(i => i.ingredientId);
    const ingredients = await this.ingredientRepository.findByIds(ingredientIds);

    let ingredientsCost = 0;
    for (const ri of recipe.ingredients) {
      const ingredient = ingredients.find(i => i.id === ri.ingredientId);
      if (!ingredient) continue;
      const pricePerUnit = ingredient.purchasePrice / ingredient.purchaseQuantity;
      ingredientsCost += pricePerUnit * ri.quantityUsed;
    }

    const additionalCostTotal = recipe.additionalCosts.reduce((sum, c) => sum + c.value, 0);
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
}
