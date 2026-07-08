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
};
