export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'unit';

export interface Ingredient {
  id: string;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIngredientDTO {
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
}
