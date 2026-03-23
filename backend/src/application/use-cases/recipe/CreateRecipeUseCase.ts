import { Recipe, CreateRecipeDTO } from '../../../domain/entities/Recipe';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';

export class CreateRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(data: CreateRecipeDTO, userId: string): Promise<Recipe> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Recipe name is required');
    }
    if (data.yield <= 0) {
      throw new Error('Yield must be greater than 0');
    }
    if (data.profitMargin < 0) {
      throw new Error('Profit margin cannot be negative');
    }
    const duplicate = await this.recipeRepository.findByName(data.name.trim(), userId);
    if (duplicate) throw new Error(`Recipe "${data.name.trim()}" already exists`);
    return this.recipeRepository.create(data, userId);
  }
}
