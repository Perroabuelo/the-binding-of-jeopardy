import { expect, test, type Page } from '@playwright/test';
import { seedCompleteBoard } from './helpers/seed';

/** Siembra el tablero completo y arranca un juego con dos equipos desde la configuración. */
async function startGameWithTwoTeams(page: Page) {
  await page.goto('./');
  const board = await seedCompleteBoard(page);
  await page.goto(`./#/boards/${board.id}/play`);
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();
  await expect(page).toHaveURL(/#\/play\/[^/]+$/);
}

function score(page: Page, name: string, points: number) {
  return page.getByRole('list', { name: 'Puntajes' }).getByRole('listitem', {
    name: `${name}: ${points} puntos`,
  });
}

test('jugar dos preguntas y reanudar tras recargar el operador', async ({ page }) => {
  await startGameWithTwoTeams(page);
  await expect(score(page, 'Equipo Rojo', 0)).toBeVisible();
  await expect(score(page, 'Equipo Azul', 0)).toBeVisible();

  await page.getByRole('button', { name: 'Categoría 1, 100' }).click();
  await expect(page.getByText('Pregunta 1-1')).toBeVisible();
  await page.getByRole('button', { name: 'Revelar respuesta' }).click();
  await page.getByRole('button', { name: 'Sumar 100 a Equipo Rojo' }).click();
  await page.getByRole('button', { name: 'Volver al tablero' }).click();

  await page.getByRole('button', { name: 'Categoría 3, 200' }).click();
  await expect(page.getByRole('region', { name: 'Respuesta' })).toContainText('Respuesta 3-2');
  await page.getByRole('button', { name: 'Restar 200 a Equipo Azul' }).click();
  await page.getByRole('button', { name: 'Volver al tablero' }).click();

  await expect(score(page, 'Equipo Rojo', 100)).toBeVisible();
  await expect(score(page, 'Equipo Azul', -200)).toBeVisible();

  await page.reload();

  await expect(score(page, 'Equipo Rojo', 100)).toBeVisible();
  await expect(score(page, 'Equipo Azul', -200)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Categoría 1, 100, usada' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Categoría 3, 200, usada' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Categoría \d, \d00$/ })).toHaveCount(23);
});
