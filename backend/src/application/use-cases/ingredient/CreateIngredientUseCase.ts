import { Ingredient, CreateIngredientDTO } from '../../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';

export class CreateIngredientUseCase {
  constructor(private ingredientRepository: IIngredientRepository) {}

  async execute(data: CreateIngredientDTO, userId: string): Promise<Ingredient> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Ingredient name is required');
    }
    if (data.purchaseQuantity <= 0) {
      throw new Error('Purchase quantity must be greater than 0');
    }
    if (data.purchasePrice <= 0) {
      throw new Error('Purchase price must be greater than 0');
    }

    const effectiveQuantity = data.purchaseUnitWeight && data.purchaseUnitWeight > 0
      ? data.purchaseQuantity * data.purchaseUnitWeight
      : data.purchaseQuantity;
    const pricePerUnit = effectiveQuantity > 0 ? data.purchasePrice / effectiveQuantity : 0;
    if (pricePerUnit < 0.001) {
      throw new Error('Price per unit is too small. Check if you filled "Weight per package" and "Quantity" correctly for pre-packaged items only.');
    }

    const duplicate = await this.ingredientRepository.findByName(data.name.trim(), userId);
    if (duplicate) throw new Error(`Ingredient "${data.name.trim()}" already exists`);
    return this.ingredientRepository.create(data, userId);
  }
}
