import { apiClient } from './client';
import { tokenStorage } from '../storage/tokenStorage';

export type PremiumPlatform = 'ios' | 'android' | 'manual';
export type PlanTier = 'free' | 'premium' | 'master';

export interface AuthUser {
  id: string;
  companyName: string;
  email: string;
  phone: string | null;
  instagramHandle: string | null;
  isPremium: boolean;
  planTier: PlanTier;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
}

const normalizeUser = (raw: any): AuthUser => ({
  id: raw.id,
  companyName: raw.companyName,
  email: raw.email,
  phone: raw.phone ?? null,
  instagramHandle: raw.instagramHandle ?? null,
  isPremium: Boolean(raw.isPremium),
  // Backend antigo não envia planTier → deriva de isPremium.
  planTier: (raw.planTier as PlanTier | undefined) ?? (Boolean(raw.isPremium) ? 'premium' : 'free'),
  premiumUntil: raw.premiumUntil ?? null,
  premiumPlatform: raw.premiumPlatform ?? null,
});

export const authApi = {
  register: async (companyName: string, email: string, password: string, phone?: string, referralCode?: string): Promise<AuthUser> => {
    const response = await apiClient.post('/auth/register', { companyName, email, password, phone, referralCode });
    const { user, token } = response.data.data;
    const normalized = normalizeUser(user);
    await tokenStorage.saveToken(token);
    await tokenStorage.saveUser(normalized);
    return normalized;
  },

  login: async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    const normalized = normalizeUser(user);
    await tokenStorage.saveToken(token);
    await tokenStorage.saveUser(normalized);
    return normalized;
  },

  me: async (): Promise<AuthUser> => {
    const response = await apiClient.get('/auth/me');
    const normalized = normalizeUser(response.data.data);
    await tokenStorage.saveUser(normalized);
    return normalized;
  },

  forgotPassword: async (email: string): Promise<string> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data.message;
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<string> => {
    const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
    return response.data.message;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<string> => {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return response.data.message;
  },

  updateProfile: async (data: { instagramHandle?: string | null; phone?: string | null }): Promise<AuthUser> => {
    const response = await apiClient.patch('/auth/profile', data);
    const normalized = normalizeUser(response.data.data);
    await tokenStorage.saveUser(normalized);
    return normalized;
  },

  syncPremium: async (active: boolean, expiresAt: string | null, platform: 'ios' | 'android'): Promise<AuthUser> => {
    const response = await apiClient.post('/premium/sync', { active, expiresAt, platform });
    const normalized = normalizeUser(response.data.data);
    await tokenStorage.saveUser(normalized);
    return normalized;
  },

  sendSuggestion: async (message: string): Promise<void> => {
    await apiClient.post('/auth/suggestion', { message });
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/auth/account');
    await tokenStorage.clear();
  },

  logout: async (): Promise<void> => {
    await tokenStorage.clear();
  },
};
