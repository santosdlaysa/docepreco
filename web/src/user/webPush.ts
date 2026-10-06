import { req } from './userApi';
import i18n from '../i18n';

/**
 * Notificações do Doce Preço neste navegador (Web Push). O service worker que
 * recebe o push é o do PWA (public/push-sw.js, importado em vite.config.ts) —
 * por isso só funciona no site publicado/preview (HTTPS), não no `vite dev`.
 */

export type WebPushSupport = 'supported' | 'unsupported' | 'ios-needs-install' | 'insecure';

export function webPushSupport(): WebPushSupport {
  if (!window.isSecureContext) return 'insecure';
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // No iPhone/iPad o push da web só existe com o site instalado na tela inicial (iOS 16.4+).
  if (isIos && !standalone) return 'ios-needs-install';
  return hasApis ? 'supported' : 'unsupported';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(i18n.t('account:webPush.swInactive'))), 8000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

/** Assinatura atual deste navegador (null se não ativada). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (webPushSupport() !== 'supported' || Notification.permission !== 'granted') return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

/** Pede permissão (deve ser chamado por clique) e registra a assinatura no servidor. */
export async function enableWebPush(): Promise<void> {
  const { publicKey } = await req<{ publicKey: string | null }>('/web-push/public-key');
  if (!publicKey) throw new Error(i18n.t('account:webPush.notAvailable'));

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? i18n.t('account:webPush.blocked')
      : i18n.t('account:webPush.notGranted'));
  }

  const reg = await readyRegistration();
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource });
  await req('/web-push/subscription', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
}

/** Remove a assinatura deste navegador (no servidor e no navegador). */
export async function disableWebPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await req('/web-push/subscription', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => false);
}
