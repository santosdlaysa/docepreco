import { apiClient } from './client';

export interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'update';
  actionUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
}

/** Banner patrocinado de confeitaria exibido no carrossel da Home. */
export interface CarouselBanner {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  imageUrl: string | null;
  paidUntil: string | null;
}

/** Banner institucional do carrossel (Loja Online), gerenciável pelo painel admin. */
export interface PlanBanner {
  id: string;
  eyebrow: string | null;
  title: string;
  message: string;
  ctaLabel: string | null;
  audience: 'all' | 'non_master' | 'master';
}

export interface BannerPurchase {
  pixRequestId: string;
  bannerId: string;
  amountCents: number;
  priceLabel: string;
  mp_qr_code: string | null;
  mp_qr_code_base64: string | null;
}

export const bannerApi = {
  getActive: async (): Promise<Banner[]> => {
    const response = await apiClient.get('/banners/active');
    return response.data.data;
  },

  /** Banners patrocinados ativos para o carrossel. */
  getCarousel: async (): Promise<CarouselBanner[]> => {
    const response = await apiClient.get('/banners/carousel');
    return response.data.data;
  },

  /** Banners institucionais do carrossel (Loja Online), por público-alvo. */
  getPlan: async (): Promise<PlanBanner[]> => {
    const response = await apiClient.get('/banners/plan');
    return response.data.data;
  },

  /** Confeitaria compra um espaço no carrossel; retorna o QR do PIX. */
  purchase: async (params: {
    imageBase64: string;
    periodDays: number;
    actionUrl?: string;
    title?: string;
    message?: string;
  }): Promise<BannerPurchase> => {
    const response = await apiClient.post('/banners/purchase', params);
    return response.data.data;
  },

  /** Consulta o status do pagamento de um anúncio. */
  getPurchaseStatus: async (pixRequestId: string): Promise<'pending' | 'approved' | 'rejected'> => {
    const response = await apiClient.get(`/banners/purchase/${pixRequestId}/status`);
    return response.data.data.status;
  },
};
