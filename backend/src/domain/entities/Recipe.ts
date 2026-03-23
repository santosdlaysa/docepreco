export interface RecipeIngredient {
  ingredientId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeDTO {
  name: string;
  yield: number;
  profitMargin: number;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
}
