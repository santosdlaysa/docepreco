import { Ingredient, CreateIngredientDTO } from '../../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';

export class UpdateIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(id: string, data: Partial<CreateIngredientDTO>, userId: string): Promise<Ingredient | null> {
    const existing = await this.ingredientRepository.findById(id, userId);
    if (!existing) throw new Error('Ingredient not found');
    if (data.name) {
      const duplicate = await this.ingredientRepository.findByName(data.name.trim(), userId, id);
      if (duplicate) throw new Error(`Ingredient "${data.name.trim()}" already exists`);
    }

    return this.ingredientRepository.update(id, data, userId);
  }
}
