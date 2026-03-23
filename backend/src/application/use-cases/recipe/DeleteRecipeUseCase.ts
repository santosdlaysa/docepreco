import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';

export class DeleteRecipeUseCase {
  constructor(private recipeRepository: IRecipeRepository) {}

  async execute(id: string, userId: string): Promise<boolean> {
    const existing = await this.recipeRepository.findById(id, userId);
    if (!existing) throw new Error('Recipe not found');
    return this.recipeRepository.delete(id, userId);
  }
}
