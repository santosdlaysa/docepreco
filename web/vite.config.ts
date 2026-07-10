import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // IMPORTANT: scope must cover the whole app, NOT just /lojas — direct links like
      // /loja/:slug (shared by store owners via WhatsApp/Instagram) must keep opening
      // straight into that store's page inside the installed app. Only the home-screen
      // icon itself should launch into /lojas.
      scope: '/',
      manifest: {
        name: 'DocePedidos',
        short_name: 'DocePedidos',
        description: 'Peça doces e bolos das confeitarias parceiras do DocePreço',
        start_url: '/lojas',
        scope: '/',
        display: 'standalone',
        background_color: '#F5F5F7',
        theme_color: '#EA4B92',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Network-first for the public catalog/list reads, so the vitrine and last-viewed
        // store still render on a flaky connection. Do NOT cache order-submission POSTs —
        // NetworkFirst with a short cache is fine for GET only; POST is never cached by
        // Workbox's default routing unless explicitly matched (leave it that way).
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/public/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'public-api-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 10 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
