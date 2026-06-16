import { Ingredient } from '../entities/Ingredient';

export const getEffectivePurchaseQuantity = (ingredient: Ingredient): number => {
  const quantity = Number(ingredient.purchaseQuantity) || 0;
  const unitWeight = Number(ingredient.purchaseUnitWeight) || 0;

  return unitWeight > 0 ? quantity * unitWeight : quantity;
};

export const getIngredientUnitPrice = (ingredient: Ingredient): number => {
  const effectiveQuantity = getEffectivePurchaseQuantity(ingredient);

  return effectiveQuantity > 0 ? ingredient.purchasePrice / effectiveQuantity : 0;
};
