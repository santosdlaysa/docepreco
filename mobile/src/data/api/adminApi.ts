import axios from 'axios';
import { tokenStorage } from '../storage/tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docepreco.onrender.com/api';

export const ADMIN_EMAIL = 'santosdlaysa@gmail.com';

// Cliente admin: autentica apenas com o JWT do usuário logado — o backend
// reconhece o admin pelo e-mail do token. O antigo x-admin-secret foi removido
// porque qualquer segredo embutido no app é extraível do bundle (vazamento).
const adminClient = axios.create({ baseURL: BASE_URL });
adminClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  config.headers = config.headers ?? {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  totalRecipes: number;
  totalSales: number;
  totalRevenue: number;
  revenueThisMonth: number;
  topByRevenue: { id: string; companyName: string; isPremium: boolean; totalRevenue: number }[];
  topByActivity: { id: string; companyName: string; isPremium: boolean; salesMonth: number; recipeCount: number }[];
  recentUsers: { id: string; companyName: string; email: string; isPremium: boolean; createdAt: string }[];
}

export interface SubscriptionDashboard {
  overview: {
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
  };
  byPlatform: {
    platform: string;
    subscriberCount: number;
    eventCount: number;
    totalBRL: number;
    avgBRL: number;
  }[];
  recentEvents: {
    id: string;
    userId: string;
    companyName: string;
    email: string;
    platform: string;
    store: string;
    productId: string;
    amountBRL: number;
    expirationAt: string | null;
    eventType: string;
    createdAt: string;
  }[];
  timeseries: {
    date: string;
    totalBRL: number;
    eventCount: number;
    uniqueUsers: number;
  }[];
}

export interface AdminUser {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  isPremium: boolean;
  planTier?: 'free' | 'premium' | 'master';
  premiumUntil: string | null;
  premiumPlatform: string | null;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  recipeCount: number;
  ingredientCount: number;
  saleCount: number;
  totalRevenue: number;
}

export interface PremiumEvent {
  id: string;
  eventType: string;
  source: string | null;
  platform: string | null;
  productId: string | null;
  expirationAt: string | null;
  store: string | null;
  amountCents: number | null;
  currency: string | null;
  createdAt: string;
}

export interface PixRequest {
  id: string;
  userId: string;
  companyName: string;
  email: string;
  planLabel: string;
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminConversation {
  userId: string;
  companyName: string;
  email: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AdminMessage {
  id: string;
  userId: string;
  senderType: 'user' | 'admin';
  message: string;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
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

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  dataJson: string | null;
  target: 'all' | 'premium' | 'free' | 'master';
  scheduledAt: string | null;
  sentAt: string | null;
  status: 'pending' | 'scheduled' | 'sent' | 'failed';
  recipientsCount: number;
  createdAt: string;
}

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

type RawAdminConversation = Partial<AdminConversation> & {
  user_id?: string;
  userName?: string;
  user_name?: string;
  company_name?: string;
  name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  userEmail?: string;
  user_email?: string;
  user?: {
    id?: string;
    companyName?: string;
    company_name?: string;
    name?: string;
    email?: string;
  };
};

const normalizeConversation = (raw: RawAdminConversation): AdminConversation => ({
  userId: raw.userId ?? raw.user_id ?? raw.user?.id ?? '',
  companyName:
    raw.companyName ??
    raw.userName ??
    raw.user_name ??
    raw.company_name ??
    raw.name ??
    raw.user?.companyName ??
    raw.user?.company_name ??
    raw.user?.name ??
    '',
  email: raw.email ?? raw.userEmail ?? raw.user_email ?? raw.user?.email ?? '',
  lastMessage: raw.lastMessage ?? raw.last_message ?? '',
  lastMessageAt: raw.lastMessageAt ?? raw.last_message_at ?? '',
  unreadCount: raw.unreadCount ?? raw.unread_count ?? 0,
});

// ── API ──────────────────────────────────────────────────────────────────────

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    const { data } = await adminClient.get('/admin/stats');
    return data.data;
  },

  async getSubscriptionDashboard(): Promise<SubscriptionDashboard> {
    const { data } = await adminClient.get('/admin/subscriptions');
    return data.data;
  },

  // Backend retorna { data: { users: [...], total, page, limit } }
  async listUsers(search?: string): Promise<AdminUser[]> {
    const params: Record<string, string> = { limit: '100' };
    if (search) params.search = search;
    const { data } = await adminClient.get('/admin/users', { params });
    return data.data.users ?? [];
  },

  async getUser(id: string): Promise<AdminUser> {
    const { data } = await adminClient.get(`/admin/users/${id}`);
    return data.data;
  },

  // Emite um token curto do usuário-alvo para o admin "ver como empresa"
  async impersonate(userId: string): Promise<{ token: string; user: any }> {
    const { data } = await adminClient.post(`/admin/users/${userId}/impersonate`, {});
    return data.data;
  },

  // Backend espera { isPremium, premiumUntil, planTier }
  async setPremium(
    userId: string,
    active: boolean,
    days?: number,
    planTier: 'premium' | 'master' = 'premium',
  ): Promise<void> {
    let premiumUntil: string | null = null;
    if (active && days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      premiumUntil = d.toISOString();
    }
    await adminClient.post(`/admin/users/${userId}/premium`, { isPremium: active, premiumUntil, planTier });
  },

  // Backend exige { days, notificationTitle, notificationBody }
  async grantTrial(userId: string, days = 7): Promise<void> {
    await adminClient.post(`/admin/users/${userId}/grant-trial`, {
      days,
      notificationTitle: '🎉 Trial ativado!',
      notificationBody: `Você ganhou ${days} dias de acesso premium. Aproveite!`,
    });
  },

  // Backend espera { isActive: boolean }
  async toggleActive(userId: string, currentIsActive: boolean): Promise<void> {
    await adminClient.post(`/admin/users/${userId}/toggle-active`, { isActive: !currentIsActive });
  },

  // Backend espera { newPassword } (mín. 6 caracteres, validado no servidor)
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await adminClient.post(`/admin/users/${userId}/reset-password`, { newPassword });
  },

  async getPremiumHistory(userId: string): Promise<PremiumEvent[]> {
    const { data } = await adminClient.get(`/admin/users/${userId}/premium-history`);
    return data.data ?? [];
  },

  async listPixRequests(): Promise<PixRequest[]> {
    const { data } = await adminClient.get('/admin/pix-requests', { params: { status: 'all' } });
    return data.data ?? [];
  },

  async approvePixRequest(id: string): Promise<void> {
    await adminClient.post(`/admin/pix-requests/${id}/approve`, {});
  },

  async rejectPixRequest(id: string): Promise<void> {
    await adminClient.post(`/admin/pix-requests/${id}/reject`, {});
  },

  async getConversations(): Promise<AdminConversation[]> {
    const { data } = await adminClient.get('/support/admin/conversations');
    const conversations: RawAdminConversation[] = Array.isArray(data.data)
      ? data.data
      : data.data?.conversations ?? [];
    return conversations.map(normalizeConversation);
  },

  async getConversationMessages(userId: string): Promise<AdminMessage[]> {
    const { data } = await adminClient.get(`/support/admin/conversations/${userId}`);
    return data.data ?? [];
  },

  async sendMessage(userId: string, message: string, imageUrl?: string | null): Promise<AdminMessage> {
    const { data } = await adminClient.post(`/support/admin/conversations/${userId}`, { message, imageUrl });
    return data.data;
  },

  async setTyping(userId: string, typing: boolean): Promise<void> {
    await adminClient.post(`/support/admin/conversations/${userId}/typing`, { typing });
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await adminClient.get('/support/admin/unread');
    return data.data?.unreadCount ?? 0;
  },

  // ── Banners ── (rota NÃO é /admin/banners, apenas /banners)
  async listBanners(): Promise<Banner[]> {
    const { data } = await adminClient.get('/banners');
    return data.data ?? [];
  },

  async createBanner(payload: {
    title: string;
    message: string;
    type: Banner['type'];
    actionUrl?: string;
    startsAt?: string;
    endsAt?: string;
  }): Promise<Banner> {
    const { data } = await adminClient.post('/banners', payload);
    return data.data;
  },

  async updateBanner(id: string, payload: Partial<{
    title: string;
    message: string;
    type: Banner['type'];
    actionUrl: string | null;
    startsAt: string;
    endsAt: string | null;
    isActive: boolean;
  }>): Promise<Banner> {
    const { data } = await adminClient.put(`/banners/${id}`, payload);
    return data.data;
  },

  async deleteBanner(id: string): Promise<void> {
    await adminClient.delete(`/banners/${id}`);
  },

  // ── Notificações ── (rota NÃO é /admin/notifications, apenas /notifications)
  async listNotifications(): Promise<AppNotification[]> {
    const { data } = await adminClient.get('/notifications');
    return data.data ?? [];
  },

  async createNotification(payload: {
    title: string;
    body: string;
    target?: AppNotification['target'];
    dataJson?: string;
    scheduledAt?: string;
  }): Promise<AppNotification> {
    const { data } = await adminClient.post('/notifications', payload);
    return data.data;
  },

  async sendNotification(id: string): Promise<void> {
    await adminClient.post(`/notifications/${id}/send`, {});
  },

  async deleteNotification(id: string): Promise<void> {
    await adminClient.delete(`/notifications/${id}`);
  },

  // ── Cupons ── (rota É prefixada com /admin/coupons)
  async listCoupons(): Promise<Coupon[]> {
    const { data } = await adminClient.get('/admin/coupons');
    return data.data ?? [];
  },

  async createCoupon(payload: {
    code: string;
    discountPercent: number;
    maxUses?: number;
    expiresAt?: string | null;
    isActive?: boolean;
  }): Promise<Coupon> {
    const { data } = await adminClient.post('/admin/coupons', payload);
    return data.data;
  },

  async updateCoupon(id: string, payload: Partial<{
    code: string;
    discountPercent: number;
    maxUses: number;
    expiresAt: string | null;
    isActive: boolean;
  }>): Promise<Coupon> {
    const { data } = await adminClient.put(`/admin/coupons/${id}`, payload);
    return data.data;
  },

  async deleteCoupon(id: string): Promise<void> {
    await adminClient.delete(`/admin/coupons/${id}`);
  },
};
