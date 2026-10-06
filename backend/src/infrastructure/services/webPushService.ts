import webpush from 'web-push';
import { PostgresPushTokenRepository } from '../repositories/PostgresPushTokenRepository';

/**
 * Web Push (navegador) — complementa o Expo Push do app. As assinaturas do
 * navegador ficam na MESMA tabela push_tokens (platform = 'web'), com o token
 * sendo o JSON canônico da PushSubscription. Assim todo envio que já existe
 * (avisos do admin, resumo de vendas, pedidos online, win-back...) alcança
 * também a web sem mudar quem chama sendPushNotifications.
 *
 * Sem VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY configurados, tudo vira no-op.
 */

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const tokenRepo = new PostgresPushTokenRepository();
let configuredWith: string | null = null;

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function webPushEnabled(): boolean {
  const pub = getVapidPublicKey();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  if (configuredWith !== pub + priv) {
    try {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || 'mailto:suporte@docepreco.site', pub, priv);
      configuredWith = pub + priv;
    } catch (err) {
      console.error('[WebPush] Chaves VAPID inválidas:', (err as Error).message);
      return false;
    }
  }
  return true;
}

/** Token canônico (chaves em ordem fixa) — permite deduplicar pelo endpoint. */
export function serializeSubscription(sub: WebPushSubscriptionInput): string {
  return JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

/** Prefixo do token de um endpoint (usado para remover/atualizar a assinatura). */
export function endpointPrefix(endpoint: string): string {
  return JSON.stringify({ endpoint }).slice(0, -1) + ',';
}

export function isValidSubscription(raw: unknown): raw is WebPushSubscriptionInput {
  const s = raw as WebPushSubscriptionInput | null;
  return !!s
    && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000
    && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string';
}

export function isWebPushToken(token: string): boolean {
  return token.startsWith('{"endpoint":');
}

/**
 * Envia para assinaturas web. Assinaturas mortas (404/410) são removidas.
 * Retorna os tokens entregues (mesma semântica do Expo: aceitos pelo serviço).
 */
export async function sendWebPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string[]> {
  const webTokens = tokens.filter(isWebPushToken);
  if (webTokens.length === 0 || !webPushEnabled()) return [];

  const payload = JSON.stringify({ title, body, data: data ?? {} });
  const delivered: string[] = [];

  await Promise.all(webTokens.map(async token => {
    let sub: WebPushSubscriptionInput;
    try {
      sub = JSON.parse(token);
    } catch {
      await tokenRepo.removeByToken(token).catch(() => {});
      return;
    }
    try {
      await webpush.sendNotification(sub, payload, { TTL: 24 * 60 * 60 });
      delivered.push(token);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await tokenRepo.removeByToken(token).catch(() => {});
      } else {
        console.error(`[WebPush] Falha no envio (${status ?? 'sem status'}):`, (err as Error).message);
      }
    }
  }));

  return delivered;
}
