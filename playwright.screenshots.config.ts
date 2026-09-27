import { defineConfig } from '@playwright/test';
import { SITE_BASE } from './site.config.ts';

const PORT = Number(process.env.E2E_PORT ?? 4174);

/**
 * Capturas del README (`npm run screenshots`). No corre en CI: se ejecuta a mano cuando cambia la
 * interfaz y las imágenes quedan en `docs/capturas/`. Las de escritorio requieren
 * `npm run build:desktop` antes.
 */
export default defineConfig({
  testDir: './screenshots',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}${SITE_BASE}`,
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    locale: 'es-CL',
    // Textos del navegador (como el selector de archivo) en español.
    channel: 'chromium',
    launchOptions: { args: ['--lang=es-419'] },
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${SITE_BASE}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
