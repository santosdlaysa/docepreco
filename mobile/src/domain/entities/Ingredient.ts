export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'unit' | 'oz' | 'lb' | 'fl_oz' | 'cup' | 'tbsp' | 'tsp';

export interface Ingredient {
  id: string;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
  purchaseUnitLabel?: string;
  purchaseUnitWeight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngredientDTO {
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
  purchaseUnitLabel?: string;
  purchaseUnitWeight?: number;
}
