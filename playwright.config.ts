import { defineConfig, devices } from '@playwright/test';
import { SITE_BASE } from './site.config.ts';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${SITE_BASE}`,
    // El service worker se bloquea por defecto para que no haya cachés entre tests.
    // Los tests de modo sin conexión lo habilitan explícitamente.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // En CI el build ya se hizo en un paso previo; localmente se construye antes de servir.
    command: isCI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${SITE_BASE}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
