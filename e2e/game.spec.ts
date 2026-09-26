import { expect, test, type Page } from '@playwright/test';
import type { Board } from '../src/domain/board';
import { makeCompleteBoard } from '../tests/fixtures/board';
import { seedBoards, seedCompleteBoard, TINY_PNG_BASE64 } from './helpers/seed';

/**
 * Siembra un tablero completo (opcionalmente con imagen en la pregunta y en la respuesta de
 * "Categoría 2, 100") y arranca un juego con dos equipos.
 */
async function startGameWithTwoTeams(
  page: Page,
  { withImage = false, withAnswerImage = false } = {},
) {
  await page.goto('./');
  let boardId: string;
  if (withImage || withAnswerImage) {
    const board = makeCompleteBoard({ id: 'e2e-board-imagen' });
    const clue = board.categories[1]!.clues[0]!;
    if (withImage) clue.imageId = 'e2e-imagen';
    if (withAnswerImage) clue.answerImageId = 'e2e-imagen-respuesta';
    await seedBoards(
      page,
      [board],
      [
        { id: 'e2e-imagen', base64: TINY_PNG_BASE64, type: 'image/png' },
        { id: 'e2e-imagen-respuesta', base64: TINY_PNG_BASE64, type: 'image/png' },
      ],
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
  await expect(page.getByRole('button', { name: /^Categoría \d, \d00$/ })).toHaveCount(28);
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

test('la TV muestra la imagen de la respuesta solo al revelarla, en lugar de la de la pregunta', async ({
  page,
}) => {
  await startGameWithTwoTeams(page, { withImage: true, withAnswerImage: true });
  const tv = await openTv(page);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  await page.getByRole('button', { name: 'Categoría 2, 100' }).click();
  // El operador ve ambas imágenes desde el principio.
  await expect(page.getByRole('img', { name: 'Imagen de la pregunta' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Respuesta' }).getByRole('img', {
      name: 'Imagen de la respuesta',
    }),
  ).toBeVisible();

  const tvClue = tv.getByRole('region', { name: 'Pregunta' });
  await expect(tvClue.getByText('Pregunta 2-1')).toBeVisible({ timeout: 1000 });
  await expect(tvClue.getByRole('img', { name: 'Imagen de la pregunta' })).toBeVisible();
  await expect(tv.getByRole('img', { name: 'Imagen de la respuesta' })).toHaveCount(0);
  await expect(tv.getByRole('img')).toHaveCount(1);

  await page.getByRole('button', { name: 'Revelar respuesta' }).click();

  await expect(tvClue.getByRole('img', { name: 'Imagen de la respuesta' })).toBeVisible({
    timeout: 1000,
  });
  await expect(tv.getByRole('img', { name: 'Imagen de la pregunta' })).toHaveCount(0);
  await expect(tv.getByRole('img')).toHaveCount(1);
  await expect(tv.getByText('Respuesta 2-1')).toBeVisible();
});

test('al cerrar el operador la TV muestra la pantalla de espera', async ({ page }) => {
  await startGameWithTwoTeams(page);
  const tv = await openTv(page);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  await page.close();

  await expect(tv.getByText('Esperando al operador…')).toBeVisible({ timeout: 12_000 });
  await expect(tv.getByRole('table', { name: 'Tablero' })).toHaveCount(0);
});

/** Siembra el tablero dado y arranca un juego con dos equipos. */
async function startGameWithBoard(page: Page, board: Board) {
  await page.goto('./');
  await seedBoards(page, [board]);
  await page.goto(`./#/boards/${board.id}/play`);
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();
}

const LONG_NAMES = [
  'Historia familiar de los abuelos paternos',
  'Supercalifragilísticoespialidoso',
  'Canciones que sonaban en todos los cumpleaños',
  'Geografía de los lugares donde vivimos',
  'Películas',
  'Comidas típicas de las fiestas de fin de año',
  'Deportes',
  'Anécdotas de las vacaciones en la playa',
];

function boardWithLongNames(categoryCount: number): Board {
  const board = makeCompleteBoard({ id: `e2e-tv-${categoryCount}` }, categoryCount);
  board.categories.forEach((category, c) => (category.name = LONG_NAMES[c]!));
  return board;
}

test.describe('TV en 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  for (const categoryCount of [3, 8]) {
    test(`el tablero de ${categoryCount} categorías se ve completo y sin texto cortado`, async ({
      page,
    }) => {
      await startGameWithBoard(page, boardWithLongNames(categoryCount));
      const tv = await openTv(page);
      const table = tv.getByRole('table', { name: 'Tablero' });
      await expect(table).toBeVisible();
      await expect(table.getByRole('columnheader')).toHaveCount(categoryCount);
      await expect(table.getByRole('cell')).toHaveCount(categoryCount * 5);

      const layout = await table.evaluate((el) => {
        const root = document.documentElement;
        const cut = [...el.querySelectorAll<HTMLElement>('th, td, td > *')]
          .filter((cell) => cell.scrollWidth > cell.clientWidth)
          .map((cell) => cell.textContent);
        return {
          pageScrolls: root.scrollWidth > root.clientWidth,
          cut,
          tableWidth: el.getBoundingClientRect().width,
          viewportWidth: root.clientWidth,
          cellFont: parseFloat(getComputedStyle(el.querySelector('td > *')!).fontSize),
        };
      });
      expect(layout.pageScrolls).toBe(false);
      expect(layout.cut).toEqual([]);
      // El tablero ocupa el ancho disponible, con el margen de la pantalla.
      expect(layout.tableWidth).toBeGreaterThan(layout.viewportWidth * 0.8);
      // Los valores de 100 a 500 se leen de lejos.
      expect(layout.cellFont).toBeGreaterThanOrEqual(32);
      for (const name of LONG_NAMES.slice(0, categoryCount)) {
        await expect(table.getByRole('columnheader', { name })).toBeVisible();
      }
    });
  }

  test('con 8 categorías la letra es más chica que con 3', async ({ page }) => {
    const fontSizes: number[] = [];
    for (const categoryCount of [3, 8]) {
      await startGameWithBoard(page, boardWithLongNames(categoryCount));
      const tv = await openTv(page);
      const table = tv.getByRole('table', { name: 'Tablero' });
      await expect(table).toBeVisible();
      fontSizes.push(
        await table
          .getByRole('columnheader')
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
      await tv.close();
    }
    expect(fontSizes[1]).toBeLessThan(fontSizes[0]!);
  });
});
