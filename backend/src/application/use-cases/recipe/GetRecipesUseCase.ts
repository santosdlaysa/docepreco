import { Recipe } from '../../../domain/entities/Recipe';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';

export class GetRecipesUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(userId: string): Promise<Recipe[]> {
    return this.recipeRepository.findAll(userId);
  }
}
