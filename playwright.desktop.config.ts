import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Pruebas de la app de escritorio con Playwright `_electron`. Corren sobre `dist/` y
 * `dist-electron/` ya compilados (`npm run build:desktop`).
 */
export default defineConfig({
  testDir: './e2e-desktop',
  // Cada prueba lanza su propia instancia de Electron con carpetas temporales.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
});
