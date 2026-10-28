import { apiClient } from './client';

export interface StripeSubscription {
  status: 'active' | 'trialing';
  /** Renovação cancelada no portal: o acesso segue até `periodEnd`, sem nova cobrança. */
  cancelScheduled: boolean;
  periodEnd: string | null;
}

export const stripeApi = {
  createCheckout: async (
    plan: 'monthly' | 'annual',
    tier: 'premium' | 'master',
  ): Promise<string> => {
    const response = await apiClient.post('/stripe/create-checkout', { plan, tier });
    return response.data.data.url as string;
  },

  /** Situação da assinatura de cartão; null se não houver uma ativa. */
  getSubscription: async (): Promise<StripeSubscription | null> => {
    const response = await apiClient.get('/stripe/subscription');
    return response.data.data ?? null;
  },

  /**
   * Portal de cobrança: ver a assinatura, trocar o cartão e cancelar.
   * flow 'cancel' abre direto na confirmação do cancelamento.
   */
  openPortal: async (flow?: 'cancel'): Promise<string> => {
    const response = await apiClient.post('/stripe/portal', flow ? { flow } : undefined);
    return response.data.data.url as string;
  },
};
