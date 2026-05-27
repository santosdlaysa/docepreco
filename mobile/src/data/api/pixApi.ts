import { apiClient } from './client';

export interface PixRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  alreadyExists?: boolean;
}

export const pixApi = {
  createRequest: async (planLabel: string, amountCents: number): Promise<PixRequest> => {
    const response = await apiClient.post('/pix/request', { planLabel, amountCents });
    return response.data.data;
  },

  getStatus: async (): Promise<PixRequest | null> => {
    const response = await apiClient.get('/pix/status');
    return response.data.data;
  },
};
