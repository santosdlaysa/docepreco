import { Ingredient } from '../../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';

export class GetIngredientsUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(userId: string): Promise<Ingredient[]> {
    return this.ingredientRepository.findAll(userId);
  }
}
