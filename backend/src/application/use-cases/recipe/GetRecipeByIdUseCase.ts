import { Recipe } from '../../../domain/entities/Recipe';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';

export class GetRecipeByIdUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(id: string, userId: string): Promise<Recipe | null> {
    return this.recipeRepository.findById(id, userId);
  }
}
