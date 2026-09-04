import { apiClient } from './client';

export const stripeApi = {
  createCheckout: async (
    plan: 'monthly' | 'annual',
    tier: 'premium' | 'master',
  ): Promise<string> => {
    const response = await apiClient.post('/stripe/create-checkout', { plan, tier });
    return response.data.data.url as string;
  },

  /** Portal de cobrança: ver a assinatura, trocar o cartão e cancelar. */
  openPortal: async (): Promise<string> => {
    const response = await apiClient.post('/stripe/portal');
    return response.data.data.url as string;
  },
};
