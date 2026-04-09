import { CalculationResult } from '../../../domain/entities/Calculation';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';
import { calculateRecipe } from '../../../domain/services/recipeCalculator';

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

    return calculateRecipe(recipe, ingredientsById);
  }
}
