export interface IngredientPurchase {
  purchaseQuantity: number;
  purchasePrice: number;
  purchaseUnitWeight?: number;
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
    } else if ((unit === 'g' && ingredient.unit === 'kg') || (unit === 'ml' && ingredient.unit === 'l')) {
      convertedQuantity /= 1000;
    } else if ((unit === 'kg' && ingredient.unit === 'g') || (unit === 'l' && ingredient.unit === 'ml')) {
      convertedQuantity *= 1000;
    } else {
      throw new Error('Unidade incompatível com o ingrediente selecionado.');
    }
  }
  return ingredient.purchasePrice * convertedQuantity / totalQuantity;
}
