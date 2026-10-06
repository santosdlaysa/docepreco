import { convertUnitOrNull } from './units';

export interface IngredientPurchase {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseUnitWeight?: number | null;
  unit: string;
}

export function getEffectivePurchaseQuantity(ingredient: IngredientPurchase): number {
  return ingredient.purchaseQuantity * (ingredient.purchaseUnitWeight || 1);
}

export function getIngredientUsageCost(ingredient: IngredientPurchase, quantity: number, unit: string): number {
  const totalQuantity = getEffectivePurchaseQuantity(ingredient);
  if (totalQuantity <= 0) return 0;
  let convertedQuantity = quantity;
  if (unit !== ingredient.unit) {
    if (unit === 'unit' && ingredient.purchaseUnitWeight && ingredient.unit !== 'unit') {
      convertedQuantity *= ingredient.purchaseUnitWeight;
    } else {
      const converted = convertUnitOrNull(quantity, unit, ingredient.unit);
      if (converted === null) throw new Error('Unidade incompatível com o ingrediente selecionado.');
      convertedQuantity = converted;
    }
  }
  return ingredient.purchasePrice * convertedQuantity / totalQuantity;
}
