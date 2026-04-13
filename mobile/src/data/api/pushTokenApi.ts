import { apiClient } from './client';

export const pushTokenApi = {
  register: async (token: string, platform: string): Promise<void> => {
    await apiClient.post('/push-tokens', { token, platform });
  },

  unregister: async (token: string): Promise<void> => {
    await apiClient.delete('/push-tokens', { data: { token } });
  },
};
