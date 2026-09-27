import { expect, test } from '@playwright/test';
import { seedCompleteBoard } from '../e2e/helpers/seed';
import { desktopDirs, launchDesktop } from './helpers/app';

test('la TV se abre en una ventana propia, se reutiliza y se cierra con el operador', async () => {
  const { app, operator } = await launchDesktop(desktopDirs());
  const board = await seedCompleteBoard(operator);
  await operator.evaluate((id) => {
    window.location.hash = `#/boards/${id}/play`;
  }, board.id);
  await operator.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await operator.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await operator.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(operator.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const tvOpened = app.waitForEvent('window');
  await operator.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await tvOpened;
  await expect(tv).toHaveURL(/^app:\/\/jeopardy\/.*#\/tv\/[^/]+$/);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();
  // Con dos monitores la TV va a pantalla completa en el otro; con uno (el runner de CI) es
  // una ventana normal. El operador nunca queda a pantalla completa.
  const layout = await app.evaluate(({ BrowserWindow, screen }) => {
    const windows = BrowserWindow.getAllWindows();
    const tvWindow = windows.find((window) => window.webContents.getURL().includes('#/tv/'))!;
    const operatorWindow = windows.find((window) => window !== tvWindow)!;
    return {
      displays: screen.getAllDisplays().length,
      tvFullScreen: tvWindow.isFullScreen(),
      operatorFullScreen: operatorWindow.isFullScreen(),
      sameDisplay:
        screen.getDisplayMatching(tvWindow.getBounds()).id ===
        screen.getDisplayMatching(operatorWindow.getBounds()).id,
    };
  });
  expect(layout.operatorFullScreen).toBe(false);
  expect(layout.tvFullScreen).toBe(layout.displays > 1);
  if (layout.displays > 1) expect(layout.sameDisplay).toBe(false);
  await expect(operator.getByLabel('Dirección de la pantalla de TV')).toHaveCount(0);

  // Operador y TV se sincronizan por BroadcastChannel en el mismo origen app://.
  await operator.getByRole('button', { name: 'Categoría 2, 100' }).click();
  await expect(
    tv.getByRole('region', { name: 'Pregunta' }).getByText('Pregunta 2-1'),
  ).toBeVisible();

  // Abrirla otra vez reutiliza la misma ventana.
  await operator.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  await operator.waitForTimeout(500);
  expect(app.windows()).toHaveLength(2);

  // Cerrar el operador cierra la TV y termina la app.
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => {
    const operatorWindow = BrowserWindow.getAllWindows().find(
      (window) => !window.webContents.getURL().includes('#/tv/'),
    );
    operatorWindow?.close();
  });
  await closed;
});
