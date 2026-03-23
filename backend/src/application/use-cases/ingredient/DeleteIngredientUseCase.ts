import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';

export class DeleteIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(id: string, userId: string): Promise<boolean> {
    const existing = await this.ingredientRepository.findById(id, userId);
    if (!existing) throw new Error('Ingredient not found');
    return this.ingredientRepository.delete(id, userId);
  }
}
