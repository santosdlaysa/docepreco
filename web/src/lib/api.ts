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
}

export interface AdminUser {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumPlatform: string | null;
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

// ── Endpoints ─────────────────────────────────────────────────────────────

export const api = {
  verify: (s: string) =>
    fetch(`${BASE}/admin/stats`, {
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': s },
    }).then(r => r.ok),

  getStats: () => req<Stats>('/admin/stats'),

  listUsers: (params: { search?: string; page?: number; isPremium?: boolean | null } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.isPremium != null) q.set('isPremium', String(params.isPremium));
    return req<UsersResponse>(`/admin/users?${q}`);
  },

  getUser: (id: string) => req<AdminUserDetail>(`/admin/users/${id}`),

  setPremium: (id: string, isPremium: boolean, premiumUntil?: string | null) =>
    req(`/admin/users/${id}/premium`, {
      method: 'POST',
      body: JSON.stringify({ isPremium, premiumUntil: premiumUntil ?? null }),
    }),
};
