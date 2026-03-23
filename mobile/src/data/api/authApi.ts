import { apiClient } from './client';
import { tokenStorage } from '../storage/tokenStorage';

export interface AuthUser {
  id: string;
  companyName: string;
  email: string;
}

export const authApi = {
  register: async (companyName: string, email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post('/auth/register', { companyName, email, password });
    const { user, token } = response.data.data;
    await tokenStorage.saveToken(token);
    await tokenStorage.saveUser(user);
    return user;
  },

  login: async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    await tokenStorage.saveToken(token);
    await tokenStorage.saveUser(user);
    return user;
  },

  logout: async (): Promise<void> => {
    await tokenStorage.clear();
  },
};
