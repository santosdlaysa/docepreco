import { apiClient } from './client';
import { tokenStorage } from '../storage/tokenStorage';

export type PremiumPlatform = 'ios' | 'android' | 'manual';

export interface AuthUser {
  id: string;
  companyName: string;
  email: string;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumPlatform: PremiumPlatform | null;
}

const normalizeUser = (raw: any): AuthUser => ({
  id: raw.id,
  companyName: raw.companyName,
  email: raw.email,
  isPremium: Boolean(raw.isPremium),
  premiumUntil: raw.premiumUntil ?? null,
  premiumPlatform: raw.premiumPlatform ?? null,
});

export const authApi = {
  register: async (companyName: string, email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post('/auth/register', { companyName, email, password });
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

  logout: async (): Promise<void> => {
    await tokenStorage.clear();
  },
};
