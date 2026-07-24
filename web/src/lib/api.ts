const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

let secret = localStorage.getItem('admin_secret') ?? '';

export function saveSecret(s: string) {
  secret = s;
  localStorage.setItem('admin_secret', s);
}

export function loadSecret() {
  return secret;
}

export function clearSecret() {
  secret = '';
  localStorage.removeItem('admin_secret');
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
      ...init.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data ?? json;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface TopRevenueUser {
  id: string;
  companyName: string;
  isPremium: boolean;
  totalRevenue: number;
}

export interface TopActivityUser {
  id: string;
  companyName: string;
  isPremium: boolean;
  salesMonth: number;
  recipeCount: number;
  ingredientCount: number;
}

export interface RecentUser {
  id: string;
  companyName: string;
  email: string;
  isPremium: boolean;
  createdAt: string;
}

export interface PremiumSubscriber {
  id: string;
  companyName: string;
  email: string;
  premiumPlatform: string | null;
  premiumUntil: string | null;
  planTier?: 'free' | 'premium' | 'master' | null;
}

export interface Stats {
  totalUsers: number;
  premiumUsers: number;
  masterUsers?: number;
  newUsersWeek: number;
  newUsersToday: number;
  newUsersMonth: number;
  totalRecipes: number;
  totalIngredients: number;
  totalSales: number;
  totalRevenue: number;
  revenueThisMonth: number;
  topByRevenue: TopRevenueUser[];
  topByActivity: TopActivityUser[];
  premiumSubscribers: PremiumSubscriber[];
  recentUsers: RecentUser[];
}

export interface SubscriptionOverview {
  activeSubscribers: number;
  expiringSubscribers: number;
  expiredSubscribers: number;
  totalSubscribers: number;
  totalReceivedBRL: number;
  monthlyReceivedBRL: number;
  lastMonthBRL: number;
  avgValueBRL: number;
  mrr: number;
  arr: number;
  momGrowth: number;
}

export interface SubscriptionByPlatform {
  platform: string;
  subscriberCount: number;
  eventCount: number;
  totalBRL: number;
  avgBRL: number;
}

export interface SubscriptionEvent {
  id: string;
  userId: string;
  companyName: string;
  email: string;
  platform: string | null;
  store: string | null;
  productId: string | null;
  amountBRL: number;
  expirationAt: string | null;
  eventType: string;
  createdAt: string;
}

export interface SubscriptionTimeseriesPoint {
  date: string;
  totalBRL: number;
  eventCount: number;
  uniqueUsers: number;
}

export interface SubscriptionDashboard {
  overview: SubscriptionOverview;
  byPlatform: SubscriptionByPlatform[];
  recentEvents: SubscriptionEvent[];
  timeseries: SubscriptionTimeseriesPoint[];
}

export interface PremiumEvent {
  id: string;
  eventType: string;
  source: string;
  platform: string | null;
  productId: string | null;
  expirationAt: string | null;
  store: string | null;
  amountCents: number | null;
  currency: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
  isPremium: boolean;
  planTier: 'free' | 'premium' | 'master';
  premiumUntil: string | null;
  premiumPlatform: string | null;
  signupPlatform: 'ios' | 'android' | null;
  lastSeenAt: string | null;
  isActive: boolean;
  recipeCount: number;
  ingredientCount: number;
  saleCount: number;
  totalRevenue: number;
}

export interface AdminUserDetail extends AdminUser {
  recentSales: Array<{
    id: string;
    recipeName: string;
    quantitySold: number;
    totalRevenue: number;
    saleDate: string;
  }>;
  storeName: string | null;
  storeSlug: string | null;
  storeActive: boolean | null;
  storeAcceptingOrders?: boolean | null;
  storeDescription: string | null;
  storeAcceptsDelivery: boolean | null;
  storeAcceptsPickup: boolean | null;
  storeMinOrderValue: number | null;
  storeDeliveryFee: number | null;
  storeCoverImageUrl: string | null;
  storeProductCount: number;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantityUsed: number;
  unit: string;
}

export interface RecipeAdditionalCost {
  name: string;
  value: number;
}

export interface UserRecipe {
  id: string;
  name: string;
  yield: number;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
  ingredientCount: number;
  totalCost: number;
  ingredients: RecipeIngredient[];
  additionalCosts: RecipeAdditionalCost[];
  subRecipes: UserSubRecipe[];
}

export interface UserSubRecipe {
  subRecipeId: string;
  subRecipeName?: string;
  quantityUsed: number;
  unit: string;
}

export interface UserIngredient {
  id: string;
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  price: number;
  packageAmount: number;
  unit: string;
  purchaseUnitLabel: string | null;
  purchaseUnitWeight: number | null;
  createdAt: string;
  updatedAt: string;
  usedInRecipes: number;
}

export interface UpdateUserIngredientDTO {
  name: string;
  purchaseQuantity: number;
  purchasePrice: number;
  unit: string;
  purchaseUnitLabel?: string | null;
  purchaseUnitWeight?: number | null;
}

export interface UpdateUserRecipeDTO {
  name: string;
  yield: number;
  profitMargin: number;
  ingredients: Array<{
    ingredientId: string;
    ingredientName?: string;
    quantityUsed: number;
    unit: string;
  }>;
  additionalCosts: RecipeAdditionalCost[];
  subRecipes: UserSubRecipe[];
}

export interface UserSale {
  id: string;
  recipeName: string | null;
  quantitySold: number;
  salePrice: number;
  totalRevenue: number;
  saleDate: string;
  notes: string | null;
  createdAt: string;
}

export interface UserData {
  user: {
    id: string;
    companyName: string;
    email: string;
    createdAt: string;
    isPremium: boolean;
    planTier: 'free' | 'premium' | 'master';
    premiumUntil: string | null;
    premiumPlatform: string | null;
    lastSeenAt: string | null;
  };
  recipes: UserRecipe[];
  ingredients: UserIngredient[];
  sales: UserSale[];
  store: UserStore | null;
  storeProducts: UserStoreProduct[];
}

export interface UserStore {
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
  address: string | null;
  updatedAt: string;
}

export interface UserStoreProduct {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  publicPrice: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStore {
  id: string;
  storeName: string;
  slug: string;
  active: boolean;
  acceptingOrders?: boolean;
  logoUrl: string | null;
  city: string | null;
  category: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  companyName: string;
  email: string;
  phone: string | null;
  isPremium: boolean;
  planTier: 'free' | 'premium' | 'master';
  /** Plano pago vigente — sem ele a loja fica fora do ar no DocePedidos mesmo com active=true. */
  hasActivePlan: boolean;
  productCount: number;
  onlineOrderCount: number;
  lastOnlineOrderAt: string | null;
}

export interface StoresResponse {
  stores: AdminStore[];
  total: number;
  activeCount: number;
  inactiveCount: number;
  page: number;
  limit: number;
}

export interface WinbackEligibleUser {
  userId: string;
  companyName: string;
  email: string;
  phone: string | null;
  premiumUntil: string;
  lastProduct: string | null;
}

export interface WinbackOffer {
  id: string;
  userId: string;
  companyName: string;
  email: string;
  discountPercent: number;
  status: 'active' | 'redeemed' | 'cancelled' | 'expired';
  expiresAt: string;
  pushSent: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  redeemedAt: string | null;
  createdAt: string;
  isPremiumNow: boolean;
}

export interface WinbackCampaignResult {
  total: number;
  offersCreated: number;
  pushSent: number;
  emailSent: number;
  whatsappSent: number;
  users: Array<{ userId: string; companyName: string; push: boolean; email: boolean; whatsapp: boolean }>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export const api = {
  verify: (s: string) =>
    fetch(`${BASE}/admin/stats`, {
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': s },
    }).then(r => r.ok).catch(() => false),

  getStats: () => req<Stats>('/admin/stats'),

  getSubscriptionDashboard: () => req<SubscriptionDashboard>('/admin/subscriptions'),

  getWinbackEligible: () => req<WinbackEligibleUser[]>('/admin/winback/eligible'),
  getWinbackOffers: () => req<WinbackOffer[]>('/admin/winback'),
  sendWinbackCampaign: (params: { discountPercent?: number; validDays?: number; userIds?: string[]; includeWhatsapp?: boolean } = {}) =>
    req<WinbackCampaignResult>('/admin/winback/send', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  listUsers: (params: {
    search?: string; page?: number; isPremium?: boolean | null; sortBy?: string;
    planTier?: 'free' | 'premium' | 'master';
    signupPlatform?: 'ios' | 'android';
    hasPhone?: boolean | null; hasInstagram?: boolean | null;
    minRecipes?: number; minIngredients?: number; minSales?: number; minRevenue?: number;
    lastSeenDays?: number; createdDays?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.isPremium != null) q.set('isPremium', String(params.isPremium));
    if (params.planTier) q.set('planTier', params.planTier);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.signupPlatform) q.set('signupPlatform', params.signupPlatform);
    if (params.hasPhone != null) q.set('hasPhone', String(params.hasPhone));
    if (params.hasInstagram != null) q.set('hasInstagram', String(params.hasInstagram));
    if (params.minRecipes) q.set('minRecipes', String(params.minRecipes));
    if (params.minIngredients) q.set('minIngredients', String(params.minIngredients));
    if (params.minSales) q.set('minSales', String(params.minSales));
    if (params.minRevenue) q.set('minRevenue', String(params.minRevenue));
    if (params.lastSeenDays != null) q.set('lastSeenDays', String(params.lastSeenDays));
    if (params.createdDays != null) q.set('createdDays', String(params.createdDays));
    return req<UsersResponse>(`/admin/users?${q}`);
  },

  listStores: (params: { search?: string; page?: number; active?: boolean | null; hasOnlineOrders?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    q.set('active', params.active == null ? 'all' : String(params.active));
    if (params.hasOnlineOrders) q.set('hasOnlineOrders', 'true');
    return req<StoresResponse>(`/admin/stores?${q}`);
  },

  getUser: (id: string) => req<AdminUserDetail>(`/admin/users/${id}`),
  getPremiumHistory: (id: string) => req<PremiumEvent[]>(`/admin/users/${id}/premium-history`),
  setPremiumEventAmount: (eventId: string, amountCents: number | null) =>
    req(`/admin/premium-events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ amountCents }),
    }),
  getUserData: (id: string) => req<UserData>(`/admin/users/${id}/data`),
  updateUserIngredient: (userId: string, ingredientId: string, data: UpdateUserIngredientDTO) =>
    req<UserIngredient>(`/admin/users/${userId}/ingredients/${ingredientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateUserRecipe: (userId: string, recipeId: string, data: UpdateUserRecipeDTO) =>
    req<UserRecipe>(`/admin/users/${userId}/recipes/${recipeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setPremium: (id: string, isPremium: boolean, premiumUntil?: string | null, planTier?: 'premium' | 'master') =>
    req<{ isPremium: boolean; planTier: 'free' | 'premium' | 'master'; premiumUntil: string | null; premiumPlatform: string | null }>(`/admin/users/${id}/premium`, {
      method: 'POST',
      body: JSON.stringify({ isPremium, premiumUntil: premiumUntil ?? null, planTier }),
    }),

  setSignupPlatform: (id: string, signupPlatform: 'ios' | 'android' | null) =>
    req<{ signupPlatform: 'ios' | 'android' | null }>(`/admin/users/${id}/signup-platform`, {
      method: 'PATCH',
      body: JSON.stringify({ signupPlatform }),
    }),

  grantTrial: (id: string, days: number, notificationTitle: string, notificationBody: string, planTier?: 'premium' | 'master') =>
    req<{ premiumUntil: string; planTier: 'premium' | 'master'; notificationSent: boolean; recipientsCount: number }>(`/admin/users/${id}/grant-trial`, {
      method: 'POST',
      body: JSON.stringify({ days, notificationTitle, notificationBody, planTier }),
    }),

  resetUserPassword: (id: string, newPassword: string) =>
    req<{ success: boolean }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  toggleUserActive: (id: string, isActive: boolean) =>
    req<{ isActive: boolean }>(`/admin/users/${id}/toggle-active`, {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),

  sendUpdateEmail: (content?: { subject?: string; intro?: string; features?: string[]; ctaText?: string; ctaUrl?: string }) =>
    req<{ sent: number; failed: number }>('/admin/send-update-email', {
      method: 'POST',
      body: JSON.stringify(content ?? {}),
    }),

  getLogs: (limit = 50) => req<LogEntry[]>(`/admin/logs?limit=${limit}`),

  getRequestLogs: (params: { limit?: number; method?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.method) q.set('method', params.method);
    if (params.search) q.set('search', params.search);
    return req<RequestLog[]>(`/admin/request-logs?${q}`);
  },

  // ── Banners ──
  listBanners: () => req<Banner[]>('/banners'),
  createBanner: (data: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<Banner>('/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: string, data: Partial<Banner>) =>
    req<Banner>(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    req<void>(`/banners/${id}`, { method: 'DELETE' }),

  // ── Tips ──
  listTips: () => req<Tip[]>('/tips'),
  createTip: (message: string) =>
    req<Tip>('/tips', { method: 'POST', body: JSON.stringify({ message }) }),
  updateTip: (id: string, data: { message?: string; isActive?: boolean }) =>
    req<Tip>(`/tips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTip: (id: string) =>
    req<void>(`/tips/${id}`, { method: 'DELETE' }),

  // ── Notification Templates ──
  listNotificationTemplates: () => req<NotificationTemplate[]>('/notification-templates'),
  updateNotificationTemplate: (id: string, data: {
    title?: string; body?: string; isActive?: boolean;
    scheduleType?: string; scheduleHour?: number | null; scheduleMinute?: number | null;
    scheduleWeekday?: number | null; scheduleIntervalHours?: number | null;
  }) =>
    req<NotificationTemplate>(`/notification-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  sendNotificationTemplate: (id: string, target: 'all' | 'premium' | 'free' = 'all') =>
    req<AppNotification>(`/notification-templates/${id}/send`, { method: 'POST', body: JSON.stringify({ target }) }),

  // ── Settings ──
  getDailyRegistrationGoal: () =>
    req<{ goal: number; registeredToday: number }>('/admin/settings/daily-registration-goal'),
  setDailyRegistrationGoal: (goal: number) =>
    req<{ goal: number }>('/admin/settings/daily-registration-goal', {
      method: 'PUT',
      body: JSON.stringify({ goal }),
    }),

  // ── Notifications ──
  listNotifications: () => req<AppNotification[]>('/notifications'),
  createNotification: (data: { title: string; body: string; target?: string; scheduledAt?: string; dataJson?: string }) =>
    req<AppNotification>('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  sendNotification: (id: string) =>
    req<AppNotification>(`/notifications/${id}/send`, { method: 'POST' }),
  deleteNotification: (id: string) =>
    req<void>(`/notifications/${id}`, { method: 'DELETE' }),

  // ── Global Ingredients ──
  listGlobalIngredients: () => req<GlobalIngredient[]>('/admin/global-ingredients'),
  createGlobalIngredient: (data: Omit<GlobalIngredient, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<GlobalIngredient>('/admin/global-ingredients', { method: 'POST', body: JSON.stringify(data) }),
  updateGlobalIngredient: (id: string, data: Partial<GlobalIngredient>) =>
    req<GlobalIngredient>(`/admin/global-ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGlobalIngredient: (id: string) =>
    req<void>(`/admin/global-ingredients/${id}`, { method: 'DELETE' }),

  // ── Featured Recipes ──
  listFeaturedRecipes: () => req<FeaturedRecipe[]>('/admin/featured-recipes'),
  createFeaturedRecipe: (data: Omit<FeaturedRecipe, 'id' | 'createdAt'>) =>
    req<FeaturedRecipe>('/admin/featured-recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateFeaturedRecipe: (id: string, data: Partial<FeaturedRecipe>) =>
    req<FeaturedRecipe>(`/admin/featured-recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFeaturedRecipe: (id: string) =>
    req<void>(`/admin/featured-recipes/${id}`, { method: 'DELETE' }),

  // ── Plan Config ──
  getPlanConfig: () => req<PlanConfig>('/admin/settings/plans'),
  updatePlanConfig: (data: PlanConfig) =>
    req<PlanConfig>('/admin/settings/plans', { method: 'PUT', body: JSON.stringify(data) }),

  // ── Feature Flags ──
  listFeatureFlags: () => req<FeatureFlag[]>('/admin/feature-flags'),
  createFeatureFlag: (data: { key: string; description: string; isEnabled: boolean }) =>
    req<FeatureFlag>('/admin/feature-flags', { method: 'POST', body: JSON.stringify(data) }),
  updateFeatureFlag: (id: string, data: Partial<FeatureFlag>) =>
    req<FeatureFlag>(`/admin/feature-flags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFeatureFlag: (id: string) =>
    req<void>(`/admin/feature-flags/${id}`, { method: 'DELETE' }),

  // ── FAQ ──
  listFaq: () => req<FaqItem[]>('/admin/faq'),
  createFaq: (data: Omit<FaqItem, 'id' | 'createdAt'>) =>
    req<FaqItem>('/admin/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id: string, data: Partial<FaqItem>) =>
    req<FaqItem>(`/admin/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (id: string) =>
    req<void>(`/admin/faq/${id}`, { method: 'DELETE' }),

  // ── Coupons ──
  listCoupons: () => req<Coupon[]>('/admin/coupons'),
  createCoupon: (data: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>) =>
    req<Coupon>('/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: Partial<Coupon>) =>
    req<Coupon>(`/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) =>
    req<void>(`/admin/coupons/${id}`, { method: 'DELETE' }),

  // ── Recipe Categories ──
  listCategories: () => req<RecipeCategory[]>('/admin/categories'),
  createCategory: (data: Omit<RecipeCategory, 'id' | 'createdAt'>) =>
    req<RecipeCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<RecipeCategory>) =>
    req<RecipeCategory>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    req<void>(`/admin/categories/${id}`, { method: 'DELETE' }),

  // ── Suggestions ──
  listSuggestions: () => req<Suggestion[]>('/admin/suggestions'),
  updateSuggestionStatus: (id: string, status: Suggestion['status']) =>
    req<Suggestion>(`/admin/suggestions/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  addSuggestionNote: (id: string, adminNote: string) =>
    req<Suggestion>(`/admin/suggestions/${id}/note`, { method: 'POST', body: JSON.stringify({ adminNote }) }),
  deleteSuggestion: (id: string) =>
    req<void>(`/admin/suggestions/${id}`, { method: 'DELETE' }),

  // ── Feedbacks ──
  listFeedbacks: () => req<Feedback[]>('/admin/feedbacks'),
  replyFeedback: (id: string, reply: string) =>
    req<Feedback>(`/admin/feedbacks/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
  updateFeedbackStatus: (id: string, status: Feedback['status']) =>
    req<Feedback>(`/admin/feedbacks/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // ── Support Chat ──
  listSupportConversations: () => req<SupportConversation[]>('/support/admin/conversations'),
  getSupportMessages: (userId: string) => req<SupportMessage[]>(`/support/admin/conversations/${userId}`),
  sendSupportMessage: (userId: string, message: string, imageUrl?: string | null) =>
    req<SupportMessage>(`/support/admin/conversations/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ message, imageUrl }),
    }),
  getSupportUnreadCount: () => req<{ unreadCount: number }>('/support/admin/unread'),
  sendSupportTyping: (userId: string) =>
    req<void>(`/support/admin/conversations/${userId}/typing`, { method: 'POST' }),

  // ── Changelog ──
  listChangelog: () => req<ChangelogEntry[]>('/admin/changelog'),
  createChangelog: (data: Omit<ChangelogEntry, 'id' | 'createdAt'>) =>
    req<ChangelogEntry>('/admin/changelog', { method: 'POST', body: JSON.stringify(data) }),
  updateChangelog: (id: string, data: Partial<ChangelogEntry>) =>
    req<ChangelogEntry>(`/admin/changelog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChangelog: (id: string) =>
    req<void>(`/admin/changelog/${id}`, { method: 'DELETE' }),

  // ── Telegram Alerts ──
  listTelegramAlerts: () => req<TelegramAlert[]>('/admin/telegram-alerts'),
  createTelegramAlert: (data: { key: string; label: string; description: string; isEnabled: boolean; category: string }) =>
    req<TelegramAlert>('/admin/telegram-alerts', { method: 'POST', body: JSON.stringify(data) }),
  updateTelegramAlert: (id: string, data: Partial<TelegramAlert>) =>
    req<TelegramAlert>(`/admin/telegram-alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTelegramAlert: (id: string) =>
    req<void>(`/admin/telegram-alerts/${id}`, { method: 'DELETE' }),

  // ── WhatsApp ──
  whatsappCreateInstance: () =>
    req<unknown>('/admin/whatsapp/instance', { method: 'POST' }),
  whatsappResetInstance: () =>
    req<unknown>('/admin/whatsapp/reset', { method: 'POST' }),
  whatsappGetQrCode: () =>
    req<{ base64: string; code: string }>('/admin/whatsapp/qrcode'),
  whatsappGetStatus: () =>
    req<{ state: string }>('/admin/whatsapp/status'),
  whatsappSend: (phone: string, message: string) =>
    req<{ status?: string; key?: { id?: string } }>('/admin/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    }),
  whatsappMessageStatus: (id: string) =>
    req<{ status: string; updatedAt: number } | null>(`/admin/whatsapp/message-status/${id}`),

  // ── PIX Requests ──
  listPixRequests: (status: string = 'pending') =>
    req<PixRequestItem[]>(`/admin/pix-requests?status=${status}`),
  approvePixRequest: (id: string, days: number = 30, planTier?: 'premium' | 'master', amountCents?: number) =>
    req<{ userId: string; premiumUntil: string }>(`/admin/pix-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ days, planTier, amountCents }),
    }),
  rejectPixRequest: (id: string) =>
    req<void>(`/admin/pix-requests/${id}/reject`, { method: 'POST' }),

  // ── Referrals ──
  listReferrals: (status: string = 'all') =>
    req<ReferralItem[]>(`/admin/referrals?status=${status}`),
  referralStats: () => req<ReferralStats>('/admin/referrals/stats'),
  invalidateReferral: (id: string) =>
    req<void>(`/admin/referrals/${id}/invalidate`, { method: 'POST' }),
  forceValidReferral: (id: string) =>
    req<void>(`/admin/referrals/${id}/force-valid`, { method: 'POST' }),

  // ── Onboarding ──
  listOnboarding: () => req<OnboardingStep[]>('/admin/onboarding'),
  createOnboarding: (data: Omit<OnboardingStep, 'id' | 'createdAt'>) =>
    req<OnboardingStep>('/admin/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  updateOnboarding: (id: string, data: Partial<OnboardingStep>) =>
    req<OnboardingStep>(`/admin/onboarding/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOnboarding: (id: string) =>
    req<void>(`/admin/onboarding/${id}`, { method: 'DELETE' }),

  executeDbQuery: (sql: string) =>
    req<{ rows: Record<string, unknown>[]; rowCount: number; command: string; fields: string[]; ms: number }>(
      '/admin/db/query',
      { method: 'POST', body: JSON.stringify({ sql }) },
    ),
};

export interface Tip {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface LogEntry {
  type: 'new_user' | 'sale' | 'premium_on' | 'premium_off' | 'suggestion' | 'pix_request';
  label: string;
  detail: string;
  ts: string;
}

export interface RequestLog {
  id: number;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  errorMessage: string | null;
  bodyEmail: string | null;
  requestBody: string | null;
  responseBody: string | null;
  ts: string;
}

export interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'update';
  actionUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** 'notification' = aviso; 'carousel' = anúncio patrocinado; 'plan' = banner institucional do carrossel. */
  placement?: 'notification' | 'carousel' | 'plan';
  /** Público-alvo dos banners 'plan'. */
  audience?: 'all' | 'non_master' | 'master';
  /** Texto pequeno acima do título (banners 'plan'). */
  eyebrow?: string | null;
  /** Rótulo do botão (banners 'plan'). */
  ctaLabel?: string | null;
  imageUrl?: string | null;
  companyId?: string | null;
  priority?: number;
  paidUntil?: string | null;
  durationDays?: number;
}

export interface NotificationTemplate {
  id: string;
  slug: string;
  title: string;
  body: string;
  isActive: boolean;
  scheduleType: 'daily' | 'weekly' | 'interval';
  scheduleHour: number | null;
  scheduleMinute: number | null;
  scheduleWeekday: number | null;
  scheduleIntervalHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  dataJson: string | null;
  target: 'all' | 'premium' | 'free' | 'master' | 'expired';
  scheduledAt: string | null;
  sentAt: string | null;
  status: 'pending' | 'scheduled' | 'sent' | 'failed';
  recipientsCount: number;
  createdAt: string;
}

// ── Telegram Alerts ──

export interface TelegramAlert {
  id: string;
  key: string;
  label: string;
  description: string;
  isEnabled: boolean;
  category: string;
  messageTemplate: string | null;
  scheduleCron: string | null;
  scheduleDescription: string | null;
  createdAt: string;
}

// ── Global Ingredients ──

export interface GlobalIngredient {
  id: string;
  name: string;
  price: number;
  unit: string;
  packageAmount: number;
  category: string;
  updatedAt: string;
  createdAt: string;
}

// ── Featured Recipes ──

export interface FeaturedRecipeIngredient {
  name: string;
  quantityUsed: number;
  unit: string;
  purchaseQuantity: number;
  purchasePrice: number;
}

export interface FeaturedRecipe {
  id: string;
  name: string;
  yield: number;
  profitMargin: number;
  isActive: boolean;
  sortOrder: number;
  ingredients: FeaturedRecipeIngredient[];
  createdAt: string;
}

// ── Plan Config ──

export interface PixPlanConfig {
  /** Valor em centavos (ex.: 1490 = R$ 14,90). */
  amountCents: number;
  /** Rótulo exibido no app (ex.: "R$ 14,90"). */
  priceLabel: string;
  /** Código PIX copia-e-cola. */
  copyPaste: string;
  /** Imagem do QR como data URI base64 (vazio → app usa o QR embutido). */
  qrImage: string;
}

export interface PixConfig {
  monthly: PixPlanConfig;
  annual: PixPlanConfig;
  masterMonthly: PixPlanConfig;
  masterAnnual: PixPlanConfig;
}

export interface AdBannerPeriod {
  days: number;
  amountCents: number;
  priceLabel: string;
}

export interface AdBannerConfig {
  enabled: boolean;
  periods: AdBannerPeriod[];
}

export interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
  premiumFreeDays: number;
  masterPrice: number;
  masterFeatures: string[];
  masterFreeDays: number;
  newUserTrialTier: 'free' | 'premium' | 'master';
  pix: PixConfig;
  adBanner: AdBannerConfig;
}

// ── Feature Flags ──

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
}

// ── FAQ ──

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ── Coupons ──

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ── Recipe Categories ──

export interface RecipeCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ── Suggestions ──

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: 'pending' | 'read' | 'done';
  adminNote: string | null;
  createdAt: string;
}

// ── Feedbacks ──

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  rating: number;
  status: 'pending' | 'read' | 'replied';
  reply: string | null;
  createdAt: string;
}

// ── Support Chat ──

export interface SupportMessage {
  id: string;
  userId: string;
  senderType: 'user' | 'admin';
  message: string;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SupportConversation {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderType: 'user' | 'admin';
  unreadCount: number;
}

// ── Changelog ──

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

// ── PIX Requests ──

export interface PixRequestItem {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  productType: 'subscription' | 'ad_banner';
  planLabel: string;
  planTier: 'premium' | 'master';
  amountCents: number;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  companyName: string;
  email: string;
  phone: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  // Anúncio de carrossel: arte e duração contratada.
  bannerImageUrl: string | null;
  bannerDurationDays: number | null;
}

// ── Referrals ──

export interface ReferralItem {
  id: string;
  status: 'pending' | 'valid' | 'rewarded' | 'invalid';
  referralCode: string;
  createdAt: string;
  activatedAt: string | null;
  rewardedAt: string | null;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
}

export interface ReferralStats {
  total: number;
  pending: number;
  valid: number;
  rewarded: number;
  invalid: number;
  conversionPercent: number;
}

// ── Onboarding ──

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  icon: string | null;
  iconColor: string | null;
  iconBg: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}
