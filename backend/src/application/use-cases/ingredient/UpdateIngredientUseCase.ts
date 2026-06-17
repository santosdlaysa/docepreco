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

    const quantity = data.purchaseQuantity ?? existing.purchaseQuantity;
    const price = data.purchasePrice ?? existing.purchasePrice;
    const unitWeight = data.purchaseUnitWeight ?? existing.purchaseUnitWeight;

    if (quantity > 0 && price > 0) {
      const effectiveQuantity = unitWeight && unitWeight > 0 ? quantity * unitWeight : quantity;
      const pricePerUnit = effectiveQuantity > 0 ? price / effectiveQuantity : 0;
      if (pricePerUnit < 0.001) {
        throw new Error('Price per unit is too small. Check if you filled "Weight per package" and "Quantity" correctly for pre-packaged items only.');
      }
    }

    return this.ingredientRepository.update(id, data, userId);
  }
}
