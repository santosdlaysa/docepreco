/**
 * Client-side mirror of the backend free-tier limits.
 * Keep in sync with backend/src/domain/services/premium.ts FREE_LIMITS.
 */
export const FREE_LIMITS = {
  recipes: 6,
} as const;

export type LimitedFeature = keyof typeof FREE_LIMITS;

/**
 * Premium-only features (no free quota — either you have premium or you don't).
 */
export const PREMIUM_FEATURES = {
  pdfCustomBranding: 'pdfCustomBranding',
  advancedReports: 'advancedReports',
  clientsManagement: 'clientsManagement',
  ordersManagement: 'ordersManagement',
  laborCostCalc: 'laborCostCalc',
  smartShoppingList: 'smartShoppingList',
  ingredientPriceHistory: 'ingredientPriceHistory',
  seasonalPricing: 'seasonalPricing',
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;

export const FEATURE_COPY: Record<PremiumFeature, { title: string; description: string }> = {
  pdfCustomBranding: {
    title: 'PDF personalizado',
    description: 'Sua logo, suas cores e sem marca do DocePreço nos orçamentos.',
  },
  advancedReports: {
    title: 'Relatórios completos',
    description: 'Gráficos de faturamento, receitas mais vendidas e margem real.',
  },
  clientsManagement: {
    title: 'Gestão de clientes',
    description: 'Cadastre clientes, veja o histórico e lembre de aniversários.',
  },
  ordersManagement: {
    title: 'Agenda de encomendas',
    description: 'Organize os pedidos, status de produção e lembretes de entrega.',
  },
  laborCostCalc: {
    title: 'Cálculo profissional',
    description: 'Inclua mão de obra e custos fixos no preço real da receita.',
  },
  smartShoppingList: {
    title: 'Lista de compras inteligente',
    description: 'Calcula o que você precisa comprar pras encomendas da semana.',
  },
  ingredientPriceHistory: {
    title: 'Histórico de preços',
    description: 'Acompanhe a evolução do custo dos seus ingredientes ao longo do tempo.',
  },
  seasonalPricing: {
    title: 'Precificação por temporada',
    description: 'Ajuste os preços automaticamente no Natal, Páscoa e outras datas especiais.',
  },
};

export const FREE_LIMIT_COPY: Record<LimitedFeature, { title: string; description: string }> = {
  recipes: {
    title: `Até ${FREE_LIMITS.recipes} receitas`,
    description: `O plano gratuito permite até ${FREE_LIMITS.recipes} receitas. Vire Premium para ilimitado.`,
  },
};
