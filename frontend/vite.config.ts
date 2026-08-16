import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA : cache du shell applicatif (JS/CSS/icônes) pour un fonctionnement
    // hors ligne complet, y compris après rechargement de la page. Les appels
    // API et Supabase ne sont PAS mis en cache par le service worker — c'est
    // la persistance IndexedDB (src/api/persist.ts) et la file d'actions
    // offline (src/offline/queue.ts) qui gèrent les données.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-inline.png', 'logo-menu.png'],
      manifest: {
        name: 'Bashkush',
        short_name: 'Bashkush',
        description:
          'Créez vos plats, planifiez vos repas et générez vos listes de courses.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#567A56',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'pwa-*.png', 'logo-inline.png', 'logo-menu.png'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Polices Google : mises en cache pour rester lisibles hors ligne.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Proxy optionnel : décommenter pour faire pointer /api vers le backend local
    // sans avoir à configurer VITE_API_URL.
    // proxy: { '/api': 'http://localhost:4000' },
  },
});
