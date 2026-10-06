/* Web Push do Doce Preço — importado pelo service worker gerado pelo vite-plugin-pwa
 * (workbox.importScripts em vite.config.ts). Payload enviado pelo backend:
 * { title, body, data } (backend/src/infrastructure/services/webPushService.ts). */
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Doce Preço';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find(c => new URL(c.url).pathname.startsWith('/app'));
    if (existing) return existing.focus();
    return self.clients.openWindow('/app');
  })());
});
