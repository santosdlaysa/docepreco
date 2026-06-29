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
};
