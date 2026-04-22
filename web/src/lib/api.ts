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
  updateNotificationTemplate: (id: string, data: { title?: string; body?: string; isActive?: boolean }) =>
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
