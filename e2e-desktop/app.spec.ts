import { expect, test } from '@playwright/test';
import type { DesktopApi } from '../src/platform/desktop';
import { desktopDirs, launchDesktop, runSecondInstance, serviceWorkerCount } from './helpers/app';

test('expone la API de escritorio y no registra service workers', async () => {
  const { app, operator } = await launchDesktop(desktopDirs());
  const version = await operator.evaluate(
    () => (window as { jeopardyDesktop?: DesktopApi }).jeopardyDesktop?.version,
  );
  expect(version).toBe(await app.evaluate(({ app }) => app.getVersion()));
  // Da tiempo a que main.tsx intente registrar el service worker si fuera a hacerlo.
  await operator.waitForTimeout(1000);
  expect(await serviceWorkerCount(app, operator)).toBe(0);
  await app.close();
});

test('una segunda instancia enfoca la primera y termina', async () => {
  const dirs = desktopDirs();
  const { app } = await launchDesktop(dirs);
  const secondInstanceSeen = app.evaluate(
    ({ app }) =>
      new Promise<boolean>((resolve) => app.once('second-instance', () => resolve(true))),
  );

  expect(await runSecondInstance(dirs)).toBe(0);
  expect(await secondInstanceSeen).toBe(true);
  expect(app.windows()).toHaveLength(1);
  await app.close();
});

test('no navega a direcciones externas', async () => {
  const { app, operator } = await launchDesktop(desktopDirs());
  const before = operator.url();
  await operator.evaluate(() => {
    window.location.href = 'https://example.com/';
  });
  await operator.waitForTimeout(1000);
  // Se consulta al proceso principal: Playwright deja la navegación bloqueada como pendiente.
  const current = await app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    return window?.webContents.getURL();
  });
  expect(current).toBe(before);
  expect(await operator.evaluate(() => document.querySelector('h1')?.textContent)).toBe('Tableros');
  await app.close();
});
