export interface RecipeIngredient {
  ingredientId: string;
  ingredientName?: string;
  quantityUsed: number;
  unit: string;
}

export interface AdditionalCost {
  name: string;
  value: number;
  costType?: 'recipe' | 'unit';
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
  yieldMode?: 'manual' | 'estimated';
  yieldTotalWeight?: number | null;
  yieldTotalUnit?: 'g' | 'kg' | null;
  yieldUnitWeight?: number | null;
  yieldUnitWeightUnit?: 'g' | 'kg' | null;
  profitMargin: number;
  photoUrl?: string;
  /**
   * Produto final (aparece no catálogo e para vender) ou receita-base
   * (massa, recheio…) usada só como sub-receita. Padrão: produto.
   */
  isProduct: boolean;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeDTO {
  name: string;
  yield: number;
  yieldMode?: 'manual' | 'estimated';
  yieldTotalWeight?: number | null;
  yieldTotalUnit?: 'g' | 'kg' | null;
  yieldUnitWeight?: number | null;
  yieldUnitWeightUnit?: 'g' | 'kg' | null;
  profitMargin: number;
  photoUrl?: string;
  isProduct?: boolean;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
}
