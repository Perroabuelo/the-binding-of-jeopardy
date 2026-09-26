import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SITE_BASE } from './site.config.ts';

export default defineConfig({
  base: SITE_BASE,
  plugins: [
    react(),
    VitePWA({
      // Sin skipWaiting ni clientsClaim: una versión nueva se activa recién cuando se cierran
      // todas las pestañas, así nunca se recarga en medio de un juego.
      registerType: 'prompt',
      injectRegister: false,
      scope: SITE_BASE,
      base: SITE_BASE,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'The Binding of Jeopardy',
        short_name: 'Jeopardy',
        description: 'Jeopardy casero con dos pantallas: operador y TV.',
        lang: 'es',
        start_url: SITE_BASE,
        scope: SITE_BASE,
        display: 'standalone',
        background_color: '#0b1026',
        theme_color: '#0b1026',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // mp3: la música del Final también suena sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,mp3}'],
        navigateFallback: `${SITE_BASE}index.html`,
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
