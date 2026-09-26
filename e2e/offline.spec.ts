import { expect, test } from '@playwright/test';
import { seedCompleteBoard } from './helpers/seed';

// Este archivo prueba el service worker: se habilita (los demás e2e lo bloquean).
test.use({ serviceWorkers: 'allow' });

test('después de cargar con red, la app funciona completa sin conexión', async ({
  page,
  context,
}) => {
  await page.goto('./');
  // Espera a que el service worker quede activo, con todo el build precacheado.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const board = await seedCompleteBoard(page);

  await context.setOffline(true);

  // Abrir sin red: la app carga y muestra los tableros guardados.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableros' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tablero de prueba' })).toBeVisible();

  // Jugar sin red: operador y TV funcionan y se sincronizan.
  await page.goto(`./#/boards/${board.id}/play`);
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await popup;
  await expect(tv.getByRole('heading', { name: 'Tablero de prueba' })).toBeVisible();

  await page.getByRole('button', { name: 'Categoría 1, 100' }).click();
  await expect(tv.getByText('Pregunta 1-1')).toBeVisible();
  await page.getByRole('button', { name: 'Revelar respuesta' }).click();
  await expect(tv.getByText('Respuesta 1-1')).toBeVisible();
});
