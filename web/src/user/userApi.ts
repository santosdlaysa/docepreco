// Cliente de API do app de usuário (web). Usa autenticação JWT (Bearer),
// igual ao app mobile — mesmo backend, mesmas contas. Espelha os endpoints
// usados em mobile/src/data/api/*.

const BASE = import.meta.env.VITE_API_URL ?? 'https://docepreco.onrender.com/api';

const TOKEN_KEY = 'user_token';

export function loadToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}
export function saveToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = loadToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token inválido/expirado em rota autenticada → força logout.
    // Ignora rotas /admin/ (ex.: config de planos é lida sem ser dono do token).
    if (res.status === 401 && token && !path.includes('/admin/')) {
      clearToken();
      onUnauthorized?.();
    }
    throw new ApiError(json.error ?? `HTTP ${res.status}`, res.status, json.code);
  }
  // Usa 'data' in json para preservar valores legítimos de null (ex.: caixa fechado → data: null).
  // Com `json.data ?? json`, um data:null retornaria o objeto inteiro {success,data} por engano.
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

/* ── Tipos (espelham mobile/src/domain/entities) ───────────────────────── */

export type PremiumPlatform = 'ios' | 'android' | 'manual';

export interface AuthUser {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  instagramHandle: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
  /** Null = usuário ainda não aceitou o termo LGPD. */
  lgpdAcceptedAt?: string | null;
}

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'unit';

export interface Ingredient {
  id: string;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
  purchaseUnitLabel?: string;
  purchaseUnitWeight?: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateIngredientDTO {
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: Unit;
  purchaseUnitLabel?: string;
  purchaseUnitWeight?: number;
}

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
  yieldMode?: 'manual' | 'estimated';
  yieldTotalWeight?: number | null;
  yieldTotalUnit?: 'g' | 'kg' | null;
  yieldUnitWeight?: number | null;
  yieldUnitWeightUnit?: 'g' | 'kg' | null;
  profitMargin: number;
  photoUrl?: string;
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
  ingredients: RecipeIngredient[];
  additionalCosts: AdditionalCost[];
  subRecipes: SubRecipe[];
}
export interface CalculationResult {
  totalCost: number;
  costPerUnit: number;
  suggestedPrice: number;
  estimatedProfit: number;
  profitMargin: number;
  ingredientsCost: number;
  additionalCostTotal: number;
  subRecipesCost: number;
}

export type PaymentMethod = 'dinheiro' | 'cartao' | 'credito' | 'debito' | 'pix';

export interface Sale {
  id: string;
  recipeId: string;
  recipeName: string;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  saleDate: string;
  clientName?: string | null;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
  orderId?: string | null;
  createdAt: string;
}
export interface CreateSaleDTO {
  recipeId: string;
  quantitySold: number;
  salePrice: number;
  saleDate: string;
  clientName?: string | null;
  notes?: string;
  paymentMethod?: PaymentMethod | null;
}

export interface CashMovement {
  id: string;
  type: 'sangria' | 'suprimento';
  amount: number;
  reason?: string | null;
  createdAt: string;
}
export interface CashSessionSale {
  id: string;
  recipeName: string;
  quantitySold: number;
  totalRevenue: number;
  paymentMethod: PaymentMethod | null;
  createdAt: string;
}
export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingCounted: number | null;
  notes: string | null;
  salesTotal: number;
  salesCount: number;
  byMethod: { dinheiro: number; cartao: number; credito: number; debito: number; pix: number; outros: number };
  sangriaTotal: number;
  suprimentoTotal: number;
  expectedCash: number;
  difference: number | null;
  movements: CashMovement[];
  sales?: CashSessionSale[];
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
}

export interface AppStats {
  recipesCount: number;
  ingredientsCount: number;
  monthlySalesCount: number;
  monthlyRevenue: number;
  recentSales: {
    id: string;
    recipeName: string;
    quantitySold: number;
    totalRevenue: number;
    saleDate: string;
  }[];
}

export type OrderStatus = 'pending' | 'in_progress' | 'done' | 'delivered' | 'cancelled';
export type OrderPaymentMethod = 'pix' | 'cash' | 'credit' | 'debit';
export interface OrderPayment {
  id: string;
  amount: number;
  method: OrderPaymentMethod;
  date: string;
}
export interface Order {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  recipeId?: string | null;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  deliveryTime?: string | null;
  status: OrderStatus;
  paid: boolean;
  paidAmount: number;
  payments: OrderPayment[];
  notes?: string | null;
  paymentMethod?: OrderPaymentMethod | null;
  changeFor?: number | null;
  createdAt: string;
  /** Transiente: retornado por create/update quando a venda foi registrada automaticamente. */
  saleRegistered?: boolean;
}
export interface CreateOrderDTO {
  clientName: string;
  clientPhone?: string;
  recipeId?: string | null;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  deliveryTime?: string;
  status: OrderStatus;
  paid?: boolean;
  paidAmount?: number;
  payments?: OrderPayment[];
  notes?: string;
}

export interface PixPlanConfig {
  amountCents: number;
  priceLabel: string;
  copyPaste: string;
  qrImage: string;
}
export interface PixConfig {
  monthly: PixPlanConfig;
  annual: PixPlanConfig;
}
export interface PlanConfigPublic {
  freeRecipeLimit?: number;
  premiumPrice?: number;
  pix?: PixConfig;
}
export interface PixRequestStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  plan_label?: string;
  amount_cents?: number;
  created_at: string;
  reviewed_at: string | null;
  alreadyExists?: boolean;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  publicPrice: number;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MyStore {
  storeName: string;
  slug: string;
  active: boolean;
  acceptingOrders?: boolean;
  description: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  minOrderValue: number | null;
  deliveryFee: number | null;
  coverImageUrl: string | null;
  logoUrl?: string | null;
  address: string | null;
  city?: string | null;
  updatedAt?: string;
  products: StoreProduct[];
}

export interface StoreSettingsDTO {
  storeName?: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  acceptsDelivery?: boolean;
  acceptsPickup?: boolean;
  minOrderValue?: number | null;
  deliveryFee?: number | null;
}

/* ── Despesas ──────────────────────────────────────────────────────────── */

export type ExpenseCostType = 'fixed' | 'variable';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  costType: ExpenseCostType;
  isRecurring: boolean;
  recurrenceDay: number | null;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateExpenseDTO {
  description: string;
  amount: number;
  category: string;
  costType: ExpenseCostType;
  isRecurring: boolean;
  recurrenceDay?: number | null;
  expenseDate: string;
  notes?: string | null;
}
export interface ExpenseSummary {
  totalExpenses: number;
  byCategory: { category: string; total: number }[];
}

export const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: 'aluguel', label: 'Aluguel' },
  { key: 'energia', label: 'Energia' },
  { key: 'agua', label: 'Água' },
  { key: 'internet', label: 'Internet' },
  { key: 'embalagem', label: 'Embalagem' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'equipamento', label: 'Equipamento' },
  { key: 'funcionario', label: 'Funcionário' },
  { key: 'outros', label: 'Outros' },
];

/* ── Clientes ──────────────────────────────────────────────────────────── */

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Aniversário no formato "MM-DD" (sem ano). */
  birthday: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}
export interface CreateClientDTO {
  name: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  address?: string | null;
  notes?: string | null;
}

/* ── Estoque ───────────────────────────────────────────────────────────── */

export interface StockItem {
  ingredientId: string;
  /** Saldo atual na unidade base do ingrediente. */
  quantity: number;
  /** Estoque mínimo para alerta de reposição. */
  minQuantity: number;
  unit: string;
  updatedAt: string;
}
export interface StockMovement {
  id: string;
  ingredientId: string;
  /** 'in' reposição/entrada, 'out' baixa/venda, 'set' ajuste de inventário. */
  type: 'in' | 'out' | 'set';
  /** Magnitude do movimento (sempre positivo). */
  quantity: number;
  /** Saldo resultante após o movimento. */
  balance: number;
  reason: string | null;
  createdAt: string;
}

/* ── Endpoints ─────────────────────────────────────────────────────────── */

export const userApi = {
  // Auth
  login: (email: string, password: string) =>
    req<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (companyName: string, email: string, password: string, phone?: string) =>
    req<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ companyName, email, password, phone, platform: 'web' }),
    }),
  me: () => req<AuthUser>('/auth/me'),
  forgotPassword: (email: string) =>
    req<unknown>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<unknown>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updateProfile: (data: { instagramHandle?: string | null; phone?: string | null }) =>
    req<AuthUser>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  acceptLgpd: () => req<{ user: AuthUser }>('/auth/accept-lgpd', { method: 'POST' }),

  // Premium / PIX
  getPlanConfig: () => req<PlanConfigPublic>('/admin/settings/plans'),
  createPixRequest: (planLabel: string, amountCents: number) =>
    req<PixRequestStatus>('/pix/request', { method: 'POST', body: JSON.stringify({ planLabel, amountCents }) }),
  getPixStatus: () => req<PixRequestStatus | null>('/pix/status'),

  // Loja online
  getMyStore: () => req<MyStore | null>('/store/my'),
  updateMyStore: (data: Partial<Pick<MyStore, 'active' | 'acceptingOrders'>>) =>
    req<MyStore>('/store/my', { method: 'PATCH', body: JSON.stringify(data) }),
  updateStoreSettings: (data: StoreSettingsDTO) =>
    req<Omit<MyStore, 'products'>>('/store/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Receitas
  listRecipes: () => req<Recipe[]>('/recipes'),
  getRecipe: (id: string) => req<Recipe>(`/recipes/${id}`),
  createRecipe: (data: CreateRecipeDTO) =>
    req<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipe: (id: string, data: Partial<CreateRecipeDTO>) =>
    req<Recipe>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipe: (id: string) => req<void>(`/recipes/${id}`, { method: 'DELETE' }),
  calculateRecipe: (id: string) =>
    req<CalculationResult>(`/recipes/${id}/calculate`, { method: 'POST' }),

  // Ingredientes
  listIngredients: () => req<Ingredient[]>('/ingredients'),
  createIngredient: (data: CreateIngredientDTO) =>
    req<Ingredient>('/ingredients', { method: 'POST', body: JSON.stringify(data) }),
  updateIngredient: (id: string, data: Partial<CreateIngredientDTO>) =>
    req<Ingredient>(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIngredient: (id: string) => req<void>(`/ingredients/${id}`, { method: 'DELETE' }),
  addPriceHistory: (id: string, entry: { price: number; purchaseQuantity: number; unit: string }) =>
    req<unknown>(`/ingredients/${id}/price-history`, { method: 'POST', body: JSON.stringify(entry) }),

  // Vendas
  listSales: (period?: 'week' | 'month') =>
    req<Sale[]>(`/sales${period ? `?period=${period}` : ''}`),
  createSale: (data: CreateSaleDTO) =>
    req<Sale>('/sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteSale: (id: string) => req<void>(`/sales/${id}`, { method: 'DELETE' }),

  // Temporadas
  listSeasons: () => req<Season[]>('/seasons'),
  createSeason: (data: Omit<Season, 'id'>) =>
    req<Season>('/seasons', { method: 'POST', body: JSON.stringify(data) }),
  updateSeason: (id: string, data: Partial<Omit<Season, 'id'>>) =>
    req<Season>(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSeason: (id: string) => req<void>(`/seasons/${id}`, { method: 'DELETE' }),

  // Encomendas
  listOrders: () => req<Order[]>('/orders'),
  createOrder: (data: CreateOrderDTO) =>
    req<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: Partial<CreateOrderDTO>) =>
    req<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id: string) => req<void>(`/orders/${id}`, { method: 'DELETE' }),

  // Estatísticas
  getStats: () => req<AppStats>('/stats'),

  // Caixa
  getCurrentCash: () => req<CashSession | null>('/cash/current'),
  openCash: (openingAmount: number, notes?: string) =>
    req<CashSession>('/cash/open', { method: 'POST', body: JSON.stringify({ openingAmount, notes }) }),
  closeCash: (countedAmount: number, notes?: string) =>
    req<CashSession>('/cash/close', { method: 'POST', body: JSON.stringify({ countedAmount, notes }) }),
  addCashMovement: (type: 'sangria' | 'suprimento', amount: number, reason?: string) =>
    req<CashSession>('/cash/movements', { method: 'POST', body: JSON.stringify({ type, amount, reason }) }),
  listCashSessions: () => req<CashSession[]>('/cash/sessions'),

  // Despesas
  listExpenses: (month?: string) =>
    req<Expense[]>(`/expenses${month ? `?month=${month}` : ''}`),
  getExpenseSummary: (month: string) =>
    req<ExpenseSummary>(`/expenses/summary?month=${month}`),
  createExpense: (data: CreateExpenseDTO) =>
    req<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: Partial<CreateExpenseDTO>) =>
    req<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => req<void>(`/expenses/${id}`, { method: 'DELETE' }),

  // Clientes
  listClients: () => req<Client[]>('/clients'),
  createClient: (data: CreateClientDTO) =>
    req<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<CreateClientDTO>) =>
    req<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) => req<void>(`/clients/${id}`, { method: 'DELETE' }),

  // Estoque
  getStock: () => req<{ items: StockItem[]; movements: StockMovement[] }>('/stock'),
  setStockQuantity: (ingredientId: string, quantity: number, minQuantity: number, unit: string) =>
    req<StockItem>(`/stock/${ingredientId}`, { method: 'PUT', body: JSON.stringify({ quantity, minQuantity, unit }) }),
  addStockEntry: (ingredientId: string, quantity: number, unit: string, reason?: string) =>
    req<StockItem>(`/stock/${ingredientId}/entry`, { method: 'POST', body: JSON.stringify({ quantity, unit, reason }) }),
  deductStock: (items: { ingredientId: string; quantity: number; reason?: string }[]) =>
    req<{ lowStock: { ingredientId: string; balance: number; minQuantity: number }[] }>('/stock/deduct', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

export { ApiError };
