import { Recipe, CreateRecipeDTO } from '../../../domain/entities/Recipe';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';

export class UpdateRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(id: string, data: Partial<CreateRecipeDTO>, userId: string): Promise<Recipe | null> {
    const existing = await this.recipeRepository.findById(id, userId);
    if (!existing) throw new Error('Recipe not found');
    if (data.name) {
      const duplicate = await this.recipeRepository.findByName(data.name.trim(), userId, id);
      if (duplicate) throw new Error(`Recipe "${data.name.trim()}" already exists`);
    }
    for (const cost of data.additionalCosts ?? []) {
      if (cost.costType !== undefined && cost.costType !== 'recipe' && cost.costType !== 'unit') {
        throw new Error('Tipo de custo adicional inválido');
      }
    }
    return this.recipeRepository.update(id, data, userId);
  }
}
