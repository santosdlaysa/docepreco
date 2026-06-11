import { apiClient } from './client';

export interface RequestTrialResponse {
  user: {
    id: string;
    isPremium: boolean;
    planTier: 'free' | 'premium' | 'master';
    premiumUntil: string | null;
  };
  trialDays: number;
  trialTier: 'premium' | 'master';
}

export const premiumApi = {
  /** Request trial for free users who never paid. */
  requestTrial: async (): Promise<RequestTrialResponse> => {
    const response = await apiClient.post('/premium/trial', {});
    return response.data.data;
  },
};
