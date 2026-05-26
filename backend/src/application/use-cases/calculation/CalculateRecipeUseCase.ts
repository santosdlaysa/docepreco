import { CalculationResult } from '../../../domain/entities/Calculation';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';
import { calculateRecipe, SubRecipeCostInfo } from '../../../domain/services/recipeCalculator';

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
    const ingredientsById = new Map(ingredients.map(i => [i.id, i]));

    // Calculate sub-recipe costs
    let subRecipeCosts: SubRecipeCostInfo[] = [];
    if (recipe.subRecipes && recipe.subRecipes.length > 0) {
      subRecipeCosts = await this.calculateSubRecipeCosts(recipe.subRecipes.map(s => s.subRecipeId), userId);
    }

    return calculateRecipe(recipe, ingredientsById, subRecipeCosts);
  }

  private async calculateSubRecipeCosts(subRecipeIds: string[], userId: string): Promise<SubRecipeCostInfo[]> {
    const costs: SubRecipeCostInfo[] = [];
    for (const subId of subRecipeIds) {
      const subRecipe = await this.recipeRepository.findById(subId, userId);
      if (!subRecipe) continue;

      const ingredientIds = subRecipe.ingredients.map(i => i.ingredientId);
      const ingredients = await this.ingredientRepository.findByIds(ingredientIds);
      const ingredientsById = new Map(ingredients.map(i => [i.id, i]));

      // Calculate sub-recipe (without nested sub-recipes to avoid deep recursion)
      const subResult = calculateRecipe(
        { ...subRecipe, subRecipes: [] },
        ingredientsById,
        []
      );

      costs.push({ subRecipeId: subId, costPerUnit: subResult.costPerUnit });
    }
    return costs;
  }
}
