import { apiClient } from './client';

export const rewardedAdApi = {
  startRecipeReward: async (): Promise<{ id: string }> => {
    const response = await apiClient.post('/rewarded-ads/recipes/start');
    return response.data.data;
  },
  getRecipeRewardStatus: async (sessionId: string): Promise<string> => {
    const response = await apiClient.get(`/rewarded-ads/recipes/${sessionId}`);
    return response.data.data.status;
  },
};
