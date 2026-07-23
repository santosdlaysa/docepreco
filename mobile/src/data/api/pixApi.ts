import { apiClient } from './client';

export interface PixRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  plan_label?: string;
  amount_cents?: number;
  created_at: string;
  reviewed_at: string | null;
  alreadyExists?: boolean;
  /** QR copia-e-cola gerado pelo Mercado Pago (pode ser null se MP não configurado) */
  mp_qr_code?: string | null;
  /** Base64 da imagem do QR (sem prefixo data:image) */
  mp_qr_code_base64?: string | null;
}

/** Assinatura recorrente via Pix Automático (Mercado Pago preapproval). */
export interface PixSubscription {
  id: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled';
  planLabel: string;
  planTier: 'premium' | 'master';
  amountCents: number;
  frequencyMonths: number;
  /** Link onde o usuário autoriza a recorrência (só enquanto pendente) */
  initPoint: string | null;
  lastChargeAt?: string | null;
  nextPaymentDate?: string | null;
  alreadyExists?: boolean;
}

/** Valor (em centavos) do antigo plano mensal por PIX. Assinantes que pagaram
 *  esse valor mantêm o preço de R$ 10,00 na renovação (preço "grandfathered"). */
export const LEGACY_MONTHLY_CENTS = 1000;

export const pixApi = {
  createRequest: async (
    planLabel: string,
    amountCents: number,
    planTier: 'premium' | 'master' = 'premium',
  ): Promise<PixRequest> => {
    const response = await apiClient.post('/pix/request', { planLabel, amountCents, planTier });
    return response.data.data;
  },

  getStatus: async (): Promise<PixRequest | null> => {
    const response = await apiClient.get('/pix/status');
    return response.data.data;
  },

  /** Cria a assinatura com renovação automática e devolve o link de autorização */
  subscribe: async (
    planLabel: string,
    amountCents: number,
    planTier: 'premium' | 'master' = 'premium',
    frequencyMonths: number = 1,
  ): Promise<PixSubscription> => {
    const response = await apiClient.post('/pix/subscription', {
      planLabel,
      amountCents,
      planTier,
      frequencyMonths,
    });
    return response.data.data;
  },

  getSubscription: async (): Promise<PixSubscription | null> => {
    const response = await apiClient.get('/pix/subscription');
    return response.data.data;
  },

  cancelSubscription: async (): Promise<void> => {
    await apiClient.delete('/pix/subscription');
  },
};
