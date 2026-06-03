import { apiClient } from './client';

export interface PixRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  plan_label?: string;
  amount_cents?: number;
  created_at: string;
  reviewed_at: string | null;
  alreadyExists?: boolean;
}

/** Valor (em centavos) do antigo plano mensal por PIX. Assinantes que pagaram
 *  esse valor mantêm o preço de R$ 10,00 na renovação (preço "grandfathered"). */
export const LEGACY_MONTHLY_CENTS = 1000;

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
