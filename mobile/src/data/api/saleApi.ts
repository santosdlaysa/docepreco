import { apiClient } from './client';
import { Sale, CreateSaleDTO } from '../../domain/entities/Sale';

export const saleApi = {
  getAll: async (period?: 'week' | 'month'): Promise<Sale[]> => {
    const params = period ? { period } : {};
    const response = await apiClient.get('/sales', { params });
    return response.data.data;
  },

  create: async (data: CreateSaleDTO): Promise<Sale> => {
    const response = await apiClient.post('/sales', data);
    return response.data.data;
  },

  update: async (id: string, data: CreateSaleDTO): Promise<Sale> => {
    const response = await apiClient.put(`/sales/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales/${id}`);
  },
};
