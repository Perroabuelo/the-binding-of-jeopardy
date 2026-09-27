import { expect, test, type Page } from '@playwright/test';
import { capture } from './capture';

const TV_VIEWPORT = { width: 1920, height: 1080 };

async function createSample(page: Page, title: string) {
  await page.getByRole('button', { name: 'Crear desde ejemplo' }).click();
  await page
    .getByRole('dialog', { name: 'Crear desde ejemplo' })
    .getByRole('button', { name: title })
    .click();
  await expect(page.getByText(`Se creó "${title}" desde el ejemplo.`)).toBeVisible();
}

/** Abre una celda, revela la respuesta, suma o resta y vuelve al tablero. */
async function playClue(page: Page, cell: string, action: string) {
  await page.getByRole('button', { name: cell, exact: true }).click();
  await page.getByRole('button', { name: 'Revelar respuesta' }).click();
  await page.getByRole('button', { name: action }).click();
  await page.getByRole('button', { name: 'Volver al tablero' }).click();
}

test('lista, editor, operador y TV de la versión web', async ({ page }) => {
  await page.goto('./');
  for (const title of ['Música: K-pop', 'Agricultura', 'Videojuegos']) {
    await createSample(page, title);
  }
  // Sin el aviso de creación, que solo aparece un momento.
  await page.reload();
  await expect(page.getByRole('list', { name: 'Tableros guardados' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 440 });
  await capture(page, 'lista');

  await page.getByRole('link', { name: 'Videojuegos' }).click();
  await expect(page.getByRole('heading', { name: 'Listo para jugar' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await capture(page, 'editor');
  await page.setViewportSize({ width: 1280, height: 840 });

  await page.getByRole('button', { name: 'Jugar' }).click();
  await page.getByLabel('Nombre del equipo 1').fill('Primos');
  await page.getByLabel('Nombre del equipo 2').fill('Tíos');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await popup;
  await tv.setViewportSize(TV_VIEWPORT);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  await playClue(page, 'Consolas, 100', 'Sumar 100 a Primos');
  await playClue(page, 'Personajes, 200', 'Sumar 200 a Tíos');
  await playClue(page, 'Nintendo, 300', 'Sumar 300 a Primos');
  await expect(tv.getByRole('cell', { name: '300, usada' })).toBeVisible();
  await capture(tv, 'tv-tablero');

  await page.getByRole('button', { name: 'Indies, 400', exact: true }).click();
  await expect(tv.getByRole('region', { name: 'Pregunta' })).toBeVisible();
  await capture(page, 'operador');
  await capture(tv, 'tv-pregunta');
  await page.getByRole('button', { name: 'Volver al tablero' }).click();

  await page.getByRole('button', { name: 'Sagas clásicas, 400, Daily Double' }).click();
  await expect(tv.getByText('DAILY DOUBLE!')).toBeVisible();
  await capture(tv, 'tv-daily-double');
});
