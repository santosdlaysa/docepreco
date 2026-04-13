import { apiClient } from './client';

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
}

export const seasonApi = {
  getAll: async (): Promise<Season[]> => {
    const response = await apiClient.get('/seasons');
    return response.data.data;
  },

  getActive: async (): Promise<Season | null> => {
    const response = await apiClient.get('/seasons/active');
    return response.data.data;
  },

  create: async (data: Omit<Season, 'id'>): Promise<Season> => {
    const response = await apiClient.post('/seasons', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<Omit<Season, 'id'>>): Promise<Season> => {
    const response = await apiClient.put(`/seasons/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/seasons/${id}`);
  },
};
