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
  /** Check if user has a payment method (required for trial). */
  hasPaymentMethod: async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/stripe/has-payment-method');
      return response.data.data.hasPaymentMethod;
    } catch {
      return false;
    }
  },

  /** Request trial for free users who never paid (requires valid payment method). */
  requestTrial: async (): Promise<RequestTrialResponse> => {
    const response = await apiClient.post('/premium/trial', {});
    return response.data.data;
  },
};
