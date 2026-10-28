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
  isActive?: boolean;
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
   * Produto final (aparece para vender) ou receita-base (massa, recheio…)
   * usada só dentro de outras. Ausente/true = produto (receitas antigas).
   */
  isProduct?: boolean;
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
  createdAt: string;
  updatedAt: string;
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

/** Receita aparece onde se escolhe o que vender (venda, encomenda, loja)? */
export const isSellable = (r: Pick<Recipe, 'isProduct'>): boolean => r.isProduct !== false;
