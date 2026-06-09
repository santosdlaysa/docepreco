import { PremiumPlatform } from '../../domain/entities/User';

/**
 * Verificação server-side de assinaturas no RevenueCat.
 *
 * Usa a REST API v1 do RevenueCat (`GET /subscribers/{app_user_id}`) com a
 * SECRET KEY do projeto (env REVENUECAT_SECRET_KEY, prefixo `sk_`). Como o app
 * faz `Purchases.logIn(userId)`, o `app_user_id` no RevenueCat é o nosso UUID.
 *
 * NUNCA confie no cliente para conceder premium — esta é a fonte de verdade.
 */

const RC_API = 'https://api.revenuecat.com/v1';

export interface RcEntitlement {
  active: boolean;
  expiresAt: Date | null;
  tier: 'premium' | 'master';
  platform: PremiumPlatform | null;
}

const storeToPlatform = (store?: string): PremiumPlatform | null => {
  if (store === 'APP_STORE' || store === 'app_store') return 'ios';
  if (store === 'PLAY_STORE' || store === 'play_store') return 'android';
  if (!store) return null;
  return 'manual';
};

/** Está configurado para validar no servidor? */
export const isRevenueCatVerificationEnabled = (): boolean =>
  !!process.env.REVENUECAT_SECRET_KEY;

/**
 * Consulta o RevenueCat e retorna a entitlement ativa do usuário, ou null se a
 * verificação não estiver configurada. Lança em erro de rede/credencial para o
 * chamador decidir (ex.: responder 502 em vez de conceder indevidamente).
 */
export async function fetchRevenueCatEntitlement(appUserId: string): Promise<RcEntitlement | null> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return null;

  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });

  // 404 = assinante desconhecido no RC → sem entitlement ativa (não é erro)
  if (res.status === 404) {
    return { active: false, expiresAt: null, tier: 'premium', platform: null };
  }
  if (!res.ok) {
    throw new Error(`RevenueCat API ${res.status}`);
  }

  const data: any = await res.json();
  const entitlements: Record<string, any> = data?.subscriber?.entitlements ?? {};
  const now = Date.now();

  let active = false;
  let latestExpiry: number | null = null;
  let tier: 'premium' | 'master' = 'premium';
  let platform: PremiumPlatform | null = null;

  for (const ent of Object.values(entitlements)) {
    const expiresMs = ent?.expires_date ? Date.parse(ent.expires_date) : null;
    const stillActive = expiresMs === null || expiresMs > now; // null = vitalício
    if (!stillActive) continue;

    active = true;
    if (expiresMs !== null && (latestExpiry === null || expiresMs > latestExpiry)) {
      latestExpiry = expiresMs;
    }
    const productId: string = (ent?.product_identifier ?? '').toLowerCase();
    if (productId.includes('master')) tier = 'master';
    if (!platform) platform = storeToPlatform(ent?.store);
  }

  return {
    active,
    expiresAt: latestExpiry ? new Date(latestExpiry) : null,
    tier,
    platform,
  };
}
