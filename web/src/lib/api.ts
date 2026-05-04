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

export interface PremiumSubscriber {
  id: string;
  companyName: string;
  email: string;
  premiumPlatform: string | null;
  premiumUntil: string | null;
}

export interface Stats {
  totalUsers: number;
  premiumUsers: number;
  newUsersWeek: number;
  newUsersToday: number;
  totalRecipes: number;
  totalIngredients: number;
  totalSales: number;
  totalRevenue: number;
  revenueThisMonth: number;
  topByRevenue: TopRevenueUser[];
  topByActivity: TopActivityUser[];
  premiumSubscribers: PremiumSubscriber[];
}

export interface AdminUser {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumPlatform: string | null;
  lastSeenAt: string | null;
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
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeIngredient {
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
}

export interface UserIngredient {
  id: string;
  name: string;
  price: number;
  packageAmount: number;
  unit: string;
  createdAt: string;
  usedInRecipes: number;
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
    premiumUntil: string | null;
    premiumPlatform: string | null;
    lastSeenAt: string | null;
  };
  recipes: UserRecipe[];
  ingredients: UserIngredient[];
  sales: UserSale[];
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export const api = {
  verify: (s: string) =>
    fetch(`${BASE}/admin/stats`, {
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': s },
    }).then(r => r.ok).catch(() => false),

  getStats: () => req<Stats>('/admin/stats'),

  listUsers: (params: { search?: string; page?: number; isPremium?: boolean | null; sortBy?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.isPremium != null) q.set('isPremium', String(params.isPremium));
    if (params.sortBy) q.set('sortBy', params.sortBy);
    return req<UsersResponse>(`/admin/users?${q}`);
  },

  getUser: (id: string) => req<AdminUserDetail>(`/admin/users/${id}`),
  getUserData: (id: string) => req<UserData>(`/admin/users/${id}/data`),

  setPremium: (id: string, isPremium: boolean, premiumUntil?: string | null) =>
    req(`/admin/users/${id}/premium`, {
      method: 'POST',
      body: JSON.stringify({ isPremium, premiumUntil: premiumUntil ?? null }),
    }),

  grantTrial: (id: string, days: number) =>
    req<{ premiumUntil: string; notificationSent: boolean; recipientsCount: number }>(`/admin/users/${id}/grant-trial`, {
      method: 'POST',
      body: JSON.stringify({ days }),
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

  // ── Feedbacks ──
  listFeedbacks: () => req<Feedback[]>('/admin/feedbacks'),
  replyFeedback: (id: string, reply: string) =>
    req<Feedback>(`/admin/feedbacks/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
  updateFeedbackStatus: (id: string, status: Feedback['status']) =>
    req<Feedback>(`/admin/feedbacks/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

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

  // ── Onboarding ──
  listOnboarding: () => req<OnboardingStep[]>('/admin/onboarding'),
  createOnboarding: (data: Omit<OnboardingStep, 'id' | 'createdAt'>) =>
    req<OnboardingStep>('/admin/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  updateOnboarding: (id: string, data: Partial<OnboardingStep>) =>
    req<OnboardingStep>(`/admin/onboarding/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOnboarding: (id: string) =>
    req<void>(`/admin/onboarding/${id}`, { method: 'DELETE' }),
};

export interface Tip {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface LogEntry {
  type: 'new_user' | 'sale' | 'premium_on' | 'premium_off';
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
  target: 'all' | 'premium' | 'free';
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

export interface PlanConfig {
  freeRecipeLimit: number;
  premiumPrice: number;
  premiumFeatures: string[];
  freeFeatures: string[];
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
