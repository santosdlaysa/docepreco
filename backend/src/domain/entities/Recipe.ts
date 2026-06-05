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

export interface SubRecipe {
  subRecipeId: string;
  subRecipeName?: string;
  quantityUsed: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  yield: number;
  profitMargin: number;
  photoUrl?: string;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeDTO {
  name: string;
  yield: number;
  profitMargin: number;
  photoUrl?: string;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
}
