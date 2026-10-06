import type {
  AuthUser, Ingredient, Recipe, Sale, Order, Client, Expense, PurchaseInvoice, Season,
  StockItem, StockMovement, StoreProduct, StoreAddon, MyStore, SupportMessage, PriceEntry,
} from '../userApi';

/**
 * Dados de exemplo do modo demonstração. Base: mobile/src/data/demo/demoData.ts
 * (mesmos ingredientes, receitas e vendas), mais o que a web também mostra:
 * sub-receita, encomendas (uma da loja online), clientes, estoque, despesas,
 * compras, temporada e loja.
 */

export interface DemoCashSession {
  id: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingCounted: number | null;
  notes: string | null;
  movements: { id: string; type: 'sangria' | 'suprimento'; amount: number; reason?: string | null; createdAt: string }[];
}

export interface DemoDb {
  user: AuthUser;
  ingredients: Ingredient[];
  recipes: Recipe[];
  sales: Sale[];
  orders: Order[];
  clients: Client[];
  expenses: Expense[];
  purchases: PurchaseInvoice[];
  seasons: Season[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  store: Omit<MyStore, 'products'>;
  storeProducts: StoreProduct[];
  storeAddons: StoreAddon[];
  supportMessages: SupportMessage[];
  priceHistory: PriceEntry[];
  cashSessions: DemoCashSession[];
  seq: number;
}

const iso = (d: Date) => d.toISOString();
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (offsetDays: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return iso(d);
};

export function createDemoDb(): DemoDb {
  const now = iso(new Date());
  const month = day(0).slice(0, 8);
  const until = new Date();
  until.setDate(until.getDate() + 30);

  const ing = (id: string, name: string, purchaseQuantity: number, purchasePrice: number, unit: Ingredient['unit'] = 'g'): Ingredient =>
    ({ id, name, purchaseQuantity, purchasePrice, unit, createdAt: now, updatedAt: now });

  return {
    seq: 100,
    // Master: a demonstração mostra todos os recursos (loja, financeiro, estoque).
    user: {
      id: 'demo-user',
      companyName: 'Doceria Demo',
      email: 'demo@docepreco.site',
      phone: null,
      instagramHandle: 'doceriademo',
      isPremium: true,
      planTier: 'master',
      premiumUntil: iso(until),
      premiumPlatform: 'manual',
      lgpdAcceptedAt: now,
    },
    ingredients: [
      ing('demo-ing-1', 'Farinha de trigo', 1000, 5.9),
      ing('demo-ing-2', 'Chocolate em pó', 400, 12.5),
      ing('demo-ing-3', 'Leite condensado', 395, 6.8),
      ing('demo-ing-4', 'Manteiga', 200, 8.9),
      ing('demo-ing-5', 'Açúcar', 1000, 4.5),
      ing('demo-ing-6', 'Creme de leite', 200, 4.2),
      ing('demo-ing-7', 'Coco ralado', 100, 4.9),
    ],
    recipes: [
      {
        id: 'demo-rec-1', name: 'Brigadeiro', yield: 40, profitMargin: 100,
        ingredients: [
          { ingredientId: 'demo-ing-2', ingredientName: 'Chocolate em pó', quantityUsed: 200, unit: 'g' },
          { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
          { ingredientId: 'demo-ing-4', ingredientName: 'Manteiga', quantityUsed: 20, unit: 'g' },
        ],
        additionalCosts: [], subRecipes: [], createdAt: now, updatedAt: now,
      },
      {
        id: 'demo-rec-2', name: 'Bolo de Pote de Chocolate', yield: 10, profitMargin: 70,
        ingredients: [
          { ingredientId: 'demo-ing-1', ingredientName: 'Farinha de trigo', quantityUsed: 500, unit: 'g' },
          { ingredientId: 'demo-ing-2', ingredientName: 'Chocolate em pó', quantityUsed: 200, unit: 'g' },
          { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
          { ingredientId: 'demo-ing-6', ingredientName: 'Creme de leite', quantityUsed: 200, unit: 'g' },
        ],
        additionalCosts: [{ name: 'Embalagem', value: 1.5, costType: 'unit' }], subRecipes: [], createdAt: now, updatedAt: now,
      },
      {
        id: 'demo-rec-3', name: 'Beijinho', yield: 30, profitMargin: 80,
        ingredients: [
          { ingredientId: 'demo-ing-3', ingredientName: 'Leite condensado', quantityUsed: 395, unit: 'g' },
          { ingredientId: 'demo-ing-4', ingredientName: 'Manteiga', quantityUsed: 15, unit: 'g' },
          { ingredientId: 'demo-ing-7', ingredientName: 'Coco ralado', quantityUsed: 50, unit: 'g' },
        ],
        additionalCosts: [], subRecipes: [], createdAt: now, updatedAt: now,
      },
      {
        // Usa o Brigadeiro como sub-receita (9 unidades por caixa).
        id: 'demo-rec-4', name: 'Caixa Presente (9 brigadeiros)', yield: 1, profitMargin: 90,
        ingredients: [],
        additionalCosts: [{ name: 'Caixa e laço', value: 6, costType: 'recipe' }],
        subRecipes: [{ subRecipeId: 'demo-rec-1', subRecipeName: 'Brigadeiro', quantityUsed: 9, unit: 'unit' }],
        createdAt: now, updatedAt: now,
      },
    ],
    sales: [
      { id: 'demo-sale-1', recipeId: 'demo-rec-1', recipeName: 'Brigadeiro', quantitySold: 40, salePrice: 1.5, totalRevenue: 60, discount: 0, saleDate: day(0), paymentMethod: 'pix', createdAt: at(0, 9) },
      { id: 'demo-sale-2', recipeId: 'demo-rec-2', recipeName: 'Bolo de Pote de Chocolate', quantitySold: 10, salePrice: 12, totalRevenue: 120, discount: 0, saleDate: day(-1), notes: 'Encomenda festa de aniversário', clientName: 'Ana Souza', paymentMethod: 'dinheiro', createdAt: at(-1) },
      { id: 'demo-sale-3', recipeId: 'demo-rec-3', recipeName: 'Beijinho', quantitySold: 30, salePrice: 1.5, totalRevenue: 45, discount: 0, saleDate: day(-2), paymentMethod: 'credito', createdAt: at(-2) },
      { id: 'demo-sale-4', recipeId: 'demo-rec-1', recipeName: 'Brigadeiro', quantitySold: 80, salePrice: 1.5, totalRevenue: 120, discount: 0, saleDate: day(-4), notes: 'Venda na feira', paymentMethod: 'dinheiro', createdAt: at(-4) },
      { id: 'demo-sale-5', recipeId: 'demo-rec-2', recipeName: 'Bolo de Pote de Chocolate', quantitySold: 10, salePrice: 13.5, totalRevenue: 135, discount: 0, saleDate: day(-6), paymentMethod: 'pix', createdAt: at(-6) },
      { id: 'demo-sale-6', recipeId: 'demo-rec-4', recipeName: 'Caixa Presente (9 brigadeiros)', quantitySold: 3, salePrice: 32, totalRevenue: 96, discount: 0, saleDate: day(-9), paymentMethod: 'debito', createdAt: at(-9) },
    ],
    orders: [
      {
        id: 'demo-ord-1', clientName: 'Ana Souza', clientPhone: '11999990001',
        recipeId: 'demo-rec-2', recipeName: 'Bolo de Pote de Chocolate', quantity: 20, unitPrice: 12, totalPrice: 240,
        items: [{ recipeId: 'demo-rec-2', recipeName: 'Bolo de Pote de Chocolate', quantity: 20, unitPrice: 12 }],
        deliveryDate: day(2), deliveryTime: '15:00', status: 'in_progress',
        paid: false, paidAmount: 100, payments: [{ id: 'demo-pay-1', amount: 100, method: 'pix', date: day(-1) }],
        notes: 'Sinal de 50% pago', paymentMethod: 'pix', source: 'manual', createdAt: at(-2),
      },
      {
        id: 'demo-ord-2', clientName: 'Carlos Lima', clientPhone: '11999990002',
        recipeId: 'demo-rec-1', recipeName: 'Brigadeiro', quantity: 100, unitPrice: 1.6, totalPrice: 160,
        items: [{ recipeId: 'demo-rec-1', recipeName: 'Brigadeiro', quantity: 100, unitPrice: 1.6 }],
        deliveryDate: day(5), deliveryTime: '10:00', status: 'pending',
        paid: false, paidAmount: 0, payments: [], notes: 'Festa infantil', source: 'manual', createdAt: at(-1),
      },
      {
        id: 'demo-ord-3', clientName: 'Juliana Reis', clientPhone: '11999990003',
        recipeId: 'demo-rec-4', recipeName: 'Caixa Presente (9 brigadeiros)', quantity: 2, unitPrice: 35, totalPrice: 75,
        items: [
          { recipeId: 'demo-rec-4', recipeName: 'Caixa Presente (9 brigadeiros)', quantity: 2, unitPrice: 35, addons: [{ name: 'Embalagem para presente', price: 5 }] },
        ],
        deliveryDate: day(1), deliveryTime: '18:00', status: 'pending',
        paid: false, paidAmount: 0, payments: [], paymentMethod: 'cash', changeFor: 100,
        deliveryAddress: 'Rua das Acácias, 45 — Jardim Primavera', orderNumber: 1027, source: 'online', createdAt: at(0, 8),
      },
    ],
    clients: [
      { id: 'demo-cli-1', name: 'Ana Souza', phone: '11999990001', email: 'ana@exemplo.com', birthday: `1990-${day(12).slice(5)}`, address: 'Rua das Flores, 10', notes: 'Prefere sem coco', createdAt: now },
      { id: 'demo-cli-2', name: 'Carlos Lima', phone: '11999990002', email: null, birthday: null, address: null, notes: null, createdAt: now },
      { id: 'demo-cli-3', name: 'Juliana Reis', phone: '11999990003', email: 'ju@exemplo.com', birthday: null, address: 'Rua das Acácias, 45', notes: 'Cliente da loja online', createdAt: now },
    ],
    expenses: [
      { id: 'demo-exp-1', description: 'Aluguel do espaço', amount: 600, category: 'aluguel', costType: 'fixed', isRecurring: true, recurrenceDay: 5, expenseDate: `${month}05`, notes: null, createdAt: now, updatedAt: now },
      { id: 'demo-exp-2', description: 'Energia elétrica', amount: 150, category: 'energia', costType: 'fixed', isRecurring: true, recurrenceDay: 10, expenseDate: `${month}10`, notes: null, createdAt: now, updatedAt: now },
      { id: 'demo-exp-3', description: 'Embalagens personalizadas', amount: 85, category: 'embalagem', costType: 'variable', isRecurring: false, recurrenceDay: null, expenseDate: `${month}03`, notes: 'Caixas para brigadeiros gourmet', createdAt: now, updatedAt: now },
      { id: 'demo-exp-4', description: 'Instagram Ads', amount: 120, category: 'marketing', costType: 'variable', isRecurring: false, recurrenceDay: null, expenseDate: `${month}01`, notes: null, createdAt: now, updatedAt: now },
    ],
    purchases: [
      {
        id: 'demo-pur-1', supplier: 'Atacadão Doce', documentNumber: '4512', purchaseDate: day(-3), paymentMethod: 'pix', paymentStatus: 'paid',
        subtotal: 62.3, discount: 2.3, freight: 0, total: 60, notes: null, createdAt: at(-3),
        items: [
          { id: 'demo-pi-1', ingredientId: 'demo-ing-3', description: 'Leite condensado', quantity: 3950, unit: 'g', total: 68, updateIngredientPrice: false },
        ],
      },
    ],
    seasons: [
      { id: 'demo-sea-1', name: 'Dia das Mães', startDate: day(-3), endDate: day(10), multiplier: 1.2 },
      { id: 'demo-sea-2', name: 'Natal', startDate: `${new Date().getFullYear()}-12-01`, endDate: `${new Date().getFullYear()}-12-25`, multiplier: 1.3 },
    ],
    stockItems: [
      { ingredientId: 'demo-ing-3', quantity: 2370, minQuantity: 790, unit: 'g', updatedAt: now },
      { ingredientId: 'demo-ing-2', quantity: 250, minQuantity: 400, unit: 'g', updatedAt: now },
      { ingredientId: 'demo-ing-4', quantity: 600, minQuantity: 200, unit: 'g', updatedAt: now },
    ],
    stockMovements: [
      { id: 'demo-mov-1', ingredientId: 'demo-ing-3', type: 'in', quantity: 3950, balance: 3950, reason: 'Compra Atacadão Doce', createdAt: at(-3) },
      { id: 'demo-mov-2', ingredientId: 'demo-ing-3', type: 'out', quantity: 1580, balance: 2370, reason: 'Venda · Brigadeiro', createdAt: at(0, 9) },
      { id: 'demo-mov-3', ingredientId: 'demo-ing-2', type: 'set', quantity: 250, balance: 250, reason: 'Inventário', createdAt: at(-2) },
      { id: 'demo-mov-4', ingredientId: 'demo-ing-4', type: 'set', quantity: 600, balance: 600, reason: 'Inventário', createdAt: at(-2) },
    ],
    store: {
      storeName: 'Doceria Demo', slug: 'doceria-demo', active: true, acceptingOrders: true,
      description: 'Confeitaria artesanal com produtos frescos!', acceptsDelivery: true, acceptsPickup: true,
      minOrderValue: 30, deliveryFee: 5, coverImageUrl: null, logoUrl: null,
      address: 'Rua das Flores, 123 — Centro', city: 'São Paulo', category: 'doceria',
      paymentMethods: ['pix', 'cash', 'credit', 'debit'], loyaltyEnabled: true, loyaltyGoal: 10, loyaltyReward: '1 caixa de brigadeiros',
      pixKey: null, pixKeyType: null, pixReceiverName: null, useBusinessHours: false, businessHours: [], updatedAt: now,
    },
    storeProducts: [
      { id: 'demo-prod-1', name: 'Brigadeiro Gourmet', description: 'Caixinha com 9 unidades', photoUrl: null, publicPrice: 45, available: true, recipeId: 'demo-rec-4', category: 'Brigadeiros', createdAt: now, updatedAt: now },
      { id: 'demo-prod-2', name: 'Bolo de Pote', description: 'Sabores variados', photoUrl: null, publicPrice: 25, available: true, recipeId: 'demo-rec-2', category: 'Bolos', createdAt: now, updatedAt: now },
      { id: 'demo-prod-3', name: 'Trufas Sortidas', description: 'Caixa com 12 unidades', photoUrl: null, publicPrice: 60, available: false, recipeId: null, category: 'Trufas', createdAt: now, updatedAt: now },
    ],
    storeAddons: [
      { id: 'demo-addon-1', name: 'Cobertura extra', price: 3, available: true, createdAt: now, updatedAt: now },
      { id: 'demo-addon-2', name: 'Embalagem para presente', price: 5, available: true, createdAt: now, updatedAt: now },
    ],
    supportMessages: [
      {
        id: 'demo-msg-1', userId: 'demo-user', senderType: 'admin', imageUrl: null, readAt: now, createdAt: at(-1),
        message: 'Oi! 👋 Este é o chat de suporte do DocePreço. Na demonstração as mensagens não são enviadas — crie sua conta grátis para falar com a gente.',
      },
    ],
    priceHistory: [
      { id: 'demo-ph-1', ingredientId: 'demo-ing-2', price: 11.9, purchaseQuantity: 400, unit: 'g', recordedAt: at(-40) },
      { id: 'demo-ph-2', ingredientId: 'demo-ing-2', price: 12.5, purchaseQuantity: 400, unit: 'g', recordedAt: at(-5) },
    ],
    cashSessions: [],
  };
}
