import { apiClient } from './client';

export interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'update';
  actionUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
}

export const bannerApi = {
  getActive: async (): Promise<Banner[]> => {
    const response = await apiClient.get('/banners/active');
    return response.data.data;
  },
};
