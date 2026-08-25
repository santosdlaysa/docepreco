import { apiClient } from './client';

export const feedbackApi = {
  sendSatisfaction: async (rating: number): Promise<void> => {
    await apiClient.post('/admin/feedbacks', {
      message: 'Pesquisa de satisfação da home',
      rating,
    });
  },
};
