import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) },
  resolve: { alias: { '@': '/src' } },
  plugins: [
    react(),
    tailwindcss(),
    // W1 installable PWA, W4 update flow (registerType "prompt" keeps the new
    // service worker waiting until the user taps Reload in the Update toast).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Shoppa',
        short_name: 'Shoppa',
        description: 'Write a list fast, share it on WhatsApp and shop from it offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#168A47',
        background_color: '#F7F7F8',
        lang: 'en-NG',
        categories: ['shopping', 'productivity', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      includeManifestIcons: false,
      workbox: {
        // App shell, fonts and icons are precached so every route opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // The dev gallery is not part of the app; keep it out of the offline cache.
        globIgnores: ['**/ComponentGallery-*.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\/v1\//],
        cleanupOutdatedCaches: true,
        // Rule 4: Background Sync wakes an open tab to flush the outbox.
        importScripts: ['/sw-sync.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true },
  build: { target: 'es2020', sourcemap: true },
});
