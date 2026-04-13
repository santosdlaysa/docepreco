import { apiClient } from './client';

export interface Tip {
  id: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export const tipApi = {
  getActive: async (): Promise<Tip[]> => {
    const response = await apiClient.get('/tips/active');
    return response.data.data;
  },
};
