import { req, AuthUser } from './userApi';

/**
 * Chamadas de engajamento (indicação, avisos/banners, anúncio, sugestão) —
 * mesmas rotas do app (mobile/src/data/api/{referralApi,bannerApi,authApi}.ts).
 */

export type ReferralStatus = 'pending' | 'valid' | 'rewarded' | 'invalid';

export interface ReferralData {
  code: string | null;
  validCount: number;
  rewardedCount: number;
  pendingCount: number;
  target: number;
  cycle: number;
  remainingToReward: number;
  rewardsEarned: number;
  history: { companyName: string; emailMasked: string; status: ReferralStatus; createdAt: string; activatedAt: string | null }[];
}

export interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo' | 'update';
  actionUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  targetPlans?: Array<'all' | 'free' | 'premium' | 'master'>;
}

export interface CarouselBanner {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  imageUrl: string | null;
  paidUntil: string | null;
}

export interface AdBannerPeriod {
  days: number;
  amountCents: number;
  priceLabel: string;
}

export interface BannerPurchase {
  pixRequestId: string;
  bannerId: string;
  amountCents: number;
  priceLabel: string;
  mp_qr_code: string | null;
  mp_qr_code_base64: string | null;
}

/** Mesmo número do suporte usado no app (ProfileScreen). */
export const SUPPORT_WHATSAPP = '5595981273912';

export const engagementApi = {
  register: (companyName: string, email: string, password: string, phone?: string, instagramHandle?: string, referralCode?: string) =>
    req<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        companyName, email, password, phone, instagramHandle, platform: 'web',
        ...(referralCode ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      }),
    }),
  getReferrals: () => req<ReferralData>('/referrals/me'),
  getActiveBanners: () => req<Banner[]>('/banners/active'),
  getCarousel: () => req<CarouselBanner[]>('/banners/carousel'),
  getAdBannerConfig: () =>
    req<{ adBanner?: { enabled: boolean; periods: AdBannerPeriod[] } }>('/admin/settings/plans')
      .then(c => c.adBanner ?? null)
      .catch(() => null),
  purchaseBanner: (params: { imageBase64: string; periodDays: number; actionUrl?: string; title?: string }) =>
    req<BannerPurchase>('/banners/purchase', { method: 'POST', body: JSON.stringify(params) }),
  getBannerPurchaseStatus: (pixRequestId: string) =>
    req<{ status: 'pending' | 'approved' | 'rejected' }>(`/banners/purchase/${pixRequestId}/status`).then(r => r.status),
  sendSuggestion: (message: string) =>
    req<unknown>('/auth/suggestion', { method: 'POST', body: JSON.stringify({ message }) }),
  /** Configurações da loja (para o alerta de cadastro incompleto). */
  getStoreSettings: () => req<{ city?: string | null; category?: string | null } | null>('/store/settings'),
};

/** Itens de loja que ficam vazios até o lojista preencher (mesma regra do app: utils/storeSetup.ts). */
export function getMissingStoreItems(settings: { city?: string | null; category?: string | null } | null): { key: string; label: string }[] {
  if (!settings) return [];
  const missing: { key: string; label: string }[] = [];
  if (!settings.city?.trim()) missing.push({ key: 'city', label: 'Cidade' });
  if (!settings.category?.trim()) missing.push({ key: 'category', label: 'Categoria da loja' });
  return missing;
}

/** localStorage com try/catch (modo privado / bloqueado não pode quebrar a tela). */
export const localPref = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignora */ }
  },
};
