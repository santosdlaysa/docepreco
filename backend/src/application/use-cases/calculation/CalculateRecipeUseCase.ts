import { CalculationResult } from '../../../domain/entities/Calculation';
import { IRecipeRepository } from '../../../domain/repositories/IRecipeRepository';
import { IIngredientRepository } from '../../../domain/repositories/IIngredientRepository';
import { Recipe, RecipeIngredient } from '../../../domain/entities/Recipe';
import { Ingredient } from '../../../domain/entities/Ingredient';
import { calculateRecipe, convertUnit, normalizeToBaseMeasure, SubRecipeCostInfo } from '../../../domain/services/recipeCalculator';

export class CalculateRecipeUseCase {
  constructor(
    private recipeRepository: IRecipeRepository,
    private ingredientRepository: IIngredientRepository
  ) {}

  async execute(recipeId: string, userId: string): Promise<CalculationResult> {
    const recipe = await this.recipeRepository.findById(recipeId, userId);
    if (!recipe) throw new Error('Recipe not found');

    const ingredientIds = recipe.ingredients.map(i => i.ingredientId);
    const ingredients = await this.ingredientRepository.findByIds(ingredientIds);
    const ingredientsById = new Map(ingredients.map(i => [i.id, i]));

    // Calculate sub-recipe costs
    let subRecipeCosts: SubRecipeCostInfo[] = [];
    if (recipe.subRecipes && recipe.subRecipes.length > 0) {
      subRecipeCosts = await this.calculateSubRecipeCosts(recipe.subRecipes.map(s => s.subRecipeId), userId);
    }

    return calculateRecipe(recipe, ingredientsById, subRecipeCosts);
  }

  private async calculateSubRecipeCosts(subRecipeIds: string[], userId: string): Promise<SubRecipeCostInfo[]> {
    const costs: SubRecipeCostInfo[] = [];
    for (const subId of subRecipeIds) {
      const subRecipe = await this.recipeRepository.findById(subId, userId);
      if (!subRecipe) continue;

      const ingredientIds = subRecipe.ingredients.map(i => i.ingredientId);
      const ingredients = await this.ingredientRepository.findByIds(ingredientIds);
      const ingredientsById = new Map(ingredients.map(i => [i.id, i]));

      // Calculate sub-recipe (without nested sub-recipes to avoid deep recursion)
      const subResult = calculateRecipe(
        { ...subRecipe, subRecipes: [] },
        ingredientsById,
        []
      );

      costs.push({
        subRecipeId: subId,
        costPerUnit: subResult.costPerUnit,
        totalCost: subResult.totalCost,
        baseQuantityProduced: this.calculateBaseQuantityProduced(subRecipe, ingredientsById),
      });
    }
    return costs;
  }

  private calculateBaseQuantityProduced(
    recipe: Pick<Recipe, 'ingredients'>,
    ingredientsById: Map<string, Ingredient>
  ): number {
    return recipe.ingredients.reduce((total, ri) => {
      const ingredient = ingredientsById.get(ri.ingredientId);
      if (!ingredient) return total;

      const quantityInIngredientUnit = this.convertIngredientQuantity(ri, ingredient);
      const baseQuantity = normalizeToBaseMeasure(quantityInIngredientUnit, ingredient.unit);
      return total + (baseQuantity ?? 0);
    }, 0);
  }

  private convertIngredientQuantity(ri: RecipeIngredient, ingredient: Ingredient): number {
    if (ri.unit === 'unit' && ingredient.purchaseUnitWeight) {
      return ri.quantityUsed * ingredient.purchaseUnitWeight;
    }
    return convertUnit(ri.quantityUsed, ri.unit, ingredient.unit);
  }
}
