import { expect, test } from '@playwright/test';
import { seedCompleteBoard } from './helpers/seed';

// La versión web no tiene las funciones propias de la app de escritorio.

test('la vista de operador no ofrece "Conectar dispositivos"', async ({ page }) => {
  await page.goto('./');
  const board = await seedCompleteBoard(page);
  await page.goto(`./#/boards/${board.id}/play`);
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir pantalla de TV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conectar dispositivos' })).toHaveCount(0);
});
