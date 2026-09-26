import { expect, test, type Page } from '@playwright/test';
import { makeCompleteBoard } from '../tests/fixtures/board';
import { seedBoards, seedCompleteBoard, TINY_PNG_BASE64 } from './helpers/seed';

/** Siembra un tablero completo (opcionalmente con imagen en "Categoría 2, 100") y arranca un juego con dos equipos. */
async function startGameWithTwoTeams(page: Page, { withImage = false } = {}) {
  await page.goto('./');
  let boardId: string;
  if (withImage) {
    const board = makeCompleteBoard({ id: 'e2e-board-imagen' });
    board.categories[1]!.clues[0]!.imageId = 'e2e-imagen';
    await seedBoards(
      page,
      [board],
      [{ id: 'e2e-imagen', base64: TINY_PNG_BASE64, type: 'image/png' }],
    );
    boardId = board.id;
  } else {
    boardId = (await seedCompleteBoard(page)).id;
  }
  await page.goto(`./#/boards/${boardId}/play`);
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

/** Abre la TV desde el operador y devuelve la ventana nueva. */
async function openTv(page: Page) {
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await popup;
  await expect(tv).toHaveURL(/#\/tv\/[^/]+$/);
  return tv;
}

test('operador y TV en dos ventanas', async ({ page }) => {
  await startGameWithTwoTeams(page, { withImage: true });
  const tv = await openTv(page);

  await expect(tv.getByRole('heading', { name: 'Tablero de prueba' })).toBeVisible();
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();
  await expect(score(tv, 'Equipo Rojo', 0)).toBeVisible();
  await expect(tv.getByRole('button')).toHaveCount(0);

  // Abrir una celda: la TV muestra pregunta, imagen y valor, pero no la respuesta.
  await page.getByRole('button', { name: 'Categoría 2, 100' }).click();
  const tvClue = tv.getByRole('region', { name: 'Pregunta' });
  await expect(tvClue.getByText('Pregunta 2-1')).toBeVisible({ timeout: 1000 });
  await expect(tvClue.getByText('100', { exact: true })).toBeVisible();
  await expect(tvClue.getByRole('img', { name: 'Imagen de la pregunta' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Respuesta' })).toContainText('Respuesta 2-1');
  expect(await tv.content()).not.toContain('Respuesta 2-1');

  await page.getByRole('button', { name: 'Revelar respuesta' }).click();
  await expect(tv.getByText('Respuesta 2-1')).toBeVisible({ timeout: 1000 });

  await page.getByRole('button', { name: 'Sumar 100 a Equipo Rojo' }).click();
  await expect(score(tv, 'Equipo Rojo', 100)).toBeVisible({ timeout: 1000 });

  // Al recargar, la TV vuelve a pedir el estado y muestra la pregunta y los puntajes actuales.
  await tv.reload();
  await expect(tv.getByText('Pregunta 2-1')).toBeVisible();
  await expect(tv.getByText('Respuesta 2-1')).toBeVisible();
  await expect(score(tv, 'Equipo Rojo', 100)).toBeVisible();
  await expect(score(tv, 'Equipo Azul', 0)).toBeVisible();

  await page.getByRole('button', { name: 'Volver al tablero' }).click();
  await expect(tv.getByRole('cell', { name: '100, usada' })).toBeVisible({ timeout: 1000 });

  await page.getByRole('button', { name: 'Terminar juego' }).click();
  await page.getByRole('button', { name: 'Sí, terminar' }).click();
  for (const window of [page, tv]) {
    const podium = window.getByRole('list', { name: 'Podio' });
    await expect(
      podium.getByRole('listitem', { name: 'Posición 1: Equipo Rojo, 100 puntos' }),
    ).toBeVisible({ timeout: 1000 });
    await expect(
      podium.getByRole('listitem', { name: 'Posición 2: Equipo Azul, 0 puntos' }),
    ).toBeVisible();
  }
});

test('al cerrar el operador la TV muestra la pantalla de espera', async ({ page }) => {
  await startGameWithTwoTeams(page);
  const tv = await openTv(page);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  await page.close();

  await expect(tv.getByText('Esperando al operador…')).toBeVisible({ timeout: 12_000 });
  await expect(tv.getByRole('table', { name: 'Tablero' })).toHaveCount(0);
});
