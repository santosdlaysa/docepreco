import { PremiumFeature, LimitedFeature } from '../premium/limits';

export type PaywallTrigger =
  | { kind: 'limit'; feature: LimitedFeature; current: number }
  | { kind: 'feature'; feature: PremiumFeature }
  | { kind: 'manual' };

export type RootStackParamList = {
  Main: undefined;
  Recipes: undefined;
  RecipeDetail: { recipeId: string };
  CreateRecipe: undefined;
  EditRecipe: { recipeId: string };
  Ingredients: undefined;
  CreateIngredient: undefined;
  EditIngredient: { ingredientId: string };
  Sales: undefined;
  CreateSale: undefined;
  Profile: undefined;
  PrivacyPolicy: undefined;
  Paywall: { trigger?: PaywallTrigger } | undefined;
};
