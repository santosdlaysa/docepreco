export interface RecipeIngredient {
  ingredientId: string;
  ingredientName?: string;
  quantityUsed: number;
  unit: string;
}

export interface AdditionalCost {
  name: string;
  value: number;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  profitMargin: number;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeDTO {
  name: string;
  yield: number;
  profitMargin: number;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
}
