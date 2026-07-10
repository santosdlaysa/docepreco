import { PremiumFeature, LimitedFeature } from '../premium/limits';

export type PaywallTrigger =
  | { kind: 'limit'; feature: LimitedFeature; current: number }
  | { kind: 'feature'; feature: PremiumFeature }
  | { kind: 'master'; feature?: string }
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
  Referral: undefined;
  PrivacyPolicy: undefined;
  Paywall: { trigger?: PaywallTrigger } | undefined;
  PixPayment: { plan?: 'monthly' | 'annual'; tier?: 'premium' | 'master' } | undefined;
  Orders: { initialFilter?: 'online' } | undefined;
  CreateOrder: undefined;
  EditOrder: { orderId: string };
  Clients: undefined;
  CreateClient: undefined;
  EditClient: { clientId: string };
  Reports: undefined;
  Finance: undefined;
  Expenses: undefined;
  CreateExpense: Record<string, never>;
  Stock: undefined;
  SalesTips: undefined;
  PdfSettings: undefined;
  CurrencySettings: undefined;
  UnitSettings: undefined;
  IngredientPriceHistory: { ingredientId: string; ingredientName: string };
  Seasons: undefined;
  CreateSeason: undefined;
  EditSeason: { seasonId: string };
  BeginnerGuide: undefined;
  SupportChat: undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminUserDetail: { userId: string };
  AdminPix: undefined;
  AdminSupport: undefined;
  AdminSupportChat: { userId: string; companyName: string };
  AdminBanners: undefined;
  AdminNotifications: undefined;
  AdminCoupons: undefined;
  PricingTutorial: undefined;
  RecipeTutorial: undefined;
  Store: { initialTab?: 'catalog' | 'orders' | 'settings' } | undefined;
  StoreProductForm: { productId?: string } | undefined;
  StoreSettings: undefined;
  AnnounceBanner: undefined;
  Notifications: undefined;
};
