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

test('con 3 categorías el juego termina al usar las 15 celdas', async ({ page }) => {
  const board = makeCompleteBoard({ id: 'e2e-tres' }, 3);
  await startGameWithBoard(page, board);

  for (let c = 1; c <= 3; c++) {
    for (const value of [100, 200, 300, 400, 500]) {
      await expect(page.getByRole('heading', { name: 'Podio' })).toHaveCount(0);
      await page.getByRole('button', { name: `Categoría ${c}, ${value}` }).click();
      await page.getByRole('button', { name: 'Volver al tablero' }).click();
    }
  }

  await expect(page.getByRole('heading', { name: 'Podio' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Podio' }).getByRole('listitem')).toHaveCount(2);
});

test('Daily Double: marcar en el editor, anunciar en la TV, apostar y reanudar', async ({
  page,
}) => {
  await page.goto('./');
  const board = await seedCompleteBoard(page);
  await page.goto(`./#/boards/${board.id}`);

  await page.getByRole('button', { name: 'Categoría 2, 400, completa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 2, 400' });
  await dialog.getByRole('checkbox', { name: 'Daily Double' }).check();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(
    page.getByRole('button', { name: 'Categoría 2, 400, completa, Daily Double' }),
  ).toContainText('DD');
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.getByRole('button', { name: 'Jugar' }).click();
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();
  const tv = await openTv(page);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();
  expect(await tv.content()).not.toMatch(/Daily Double|>DD</i);

  // Abrir el Daily Double: la TV lo anuncia sin la pregunta.
  await page.getByRole('button', { name: 'Categoría 2, 400, Daily Double' }).click();
  await expect(page.getByRole('region', { name: 'Daily Double' })).toContainText('Pregunta 2-4');
  const announcement = tv.getByRole('region', { name: 'Daily Double' });
  await expect(announcement.getByText('DAILY DOUBLE!')).toBeVisible({ timeout: 1000 });
  await expect(announcement).toContainText('Categoría 2');
  await expect(announcement).toContainText('400');
  expect(await tv.content()).not.toContain('Pregunta 2-4');

  // Recargar el operador mientras espera la apuesta y reanudar en el mismo punto.
  await page.reload();
  const wager = page.getByRole('region', { name: 'Daily Double' });
  await expect(wager).toContainText('Pregunta 2-4');
  await expect(tv.getByText('DAILY DOUBLE!')).toBeVisible();
  expect(await tv.content()).not.toContain('Pregunta 2-4');

  await wager.getByLabel('Equipo que responde').selectOption({ label: 'Equipo Azul' });
  await expect(wager).toContainText('máximo 500');
  await wager.getByLabel('Apuesta').fill('600');
  await expect(wager.getByRole('button', { name: 'Registrar apuesta' })).toBeDisabled();
  await wager.getByLabel('Apuesta').fill('500');
  await wager.getByRole('button', { name: 'Registrar apuesta' }).click();

  const tvClue = tv.getByRole('region', { name: 'Pregunta' });
  await expect(tvClue.getByText('Pregunta 2-4')).toBeVisible({ timeout: 1000 });
  await expect(tvClue.getByText('Equipo Azul apuesta 500')).toBeVisible();
  await expect(page.getByText('Daily Double: Equipo Azul apuesta 500')).toBeVisible();
  await expect(page.getByRole('button', { name: /a Equipo Rojo$/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Sumar 500 a Equipo Azul' }).click();
  for (const window of [page, tv]) {
    await expect(score(window, 'Equipo Azul', 500)).toBeVisible({ timeout: 1000 });
    await expect(score(window, 'Equipo Rojo', 0)).toBeVisible();
  }

  await page.getByRole('button', { name: 'Volver al tablero' }).click();
  await expect(page.getByRole('button', { name: 'Categoría 2, 400, usada' })).toBeDisabled();
  await expect(tv.getByRole('cell', { name: '400, usada' })).toBeVisible({ timeout: 1000 });
});

test('Final Jeopardy!: pista final en el editor, apuestas, temporizador, revelación y podio', async ({
  page,
}) => {
  await page.goto('./');
  const small = makeCompleteBoard({ id: 'e2e-final' }, 3);
  await seedBoards(page, [small]);
  await page.goto(`./#/boards/${small.id}`);

  // Completar la pista final en el editor.
  const section = page.getByRole('region', { name: 'Pista final' });
  await section.getByLabel('Categoría de la pista final').fill('Cumpleañero');
  await section.getByLabel('Pregunta de la pista final').fill('Pregunta final secreta');
  await section.getByLabel('Respuesta de la pista final').fill('Respuesta final secreta');
  await expect(page.getByText('Pista final: completa.')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.getByRole('button', { name: 'Jugar' }).click();
  await expect(page.getByRole('checkbox', { name: 'Jugar Final Jeopardy!' })).toBeChecked();
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Agregar equipo' }).click();
  await page.getByLabel('Nombre del equipo 3').fill('Equipo Verde');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();
  const tv = await openTv(page);
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  // Rojo 100, Azul 200 y Verde 0; se usan las 15 celdas.
  await page.getByRole('button', { name: 'Categoría 1, 100' }).click();
  await page.getByRole('button', { name: 'Sumar 100 a Equipo Rojo' }).click();
  await page.getByRole('button', { name: 'Volver al tablero' }).click();
  await page.getByRole('button', { name: 'Categoría 1, 200' }).click();
  await page.getByRole('button', { name: 'Sumar 200 a Equipo Azul' }).click();
  await page.getByRole('button', { name: 'Volver al tablero' }).click();
  for (let c = 1; c <= 3; c++) {
    for (const value of [100, 200, 300, 400, 500]) {
      if (c === 1 && value <= 200) continue;
      await page.getByRole('button', { name: `Categoría ${c}, ${value}` }).click();
      await page.getByRole('button', { name: 'Volver al tablero' }).click();
    }
  }

  // Apuestas: la TV muestra la categoría y quiénes juegan, sin la pregunta.
  const final = page.getByRole('region', { name: 'Final Jeopardy!' });
  await expect(final).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Podio' })).toHaveCount(0);
  await expect(final.getByRole('region', { name: 'No participan' })).toContainText('Equipo Verde');
  const tvFinal = tv.getByRole('region', { name: 'Final Jeopardy!' });
  await expect(tvFinal).toContainText('Cumpleañero', { timeout: 1000 });
  await expect(tvFinal).toContainText('Juegan: Equipo Rojo, Equipo Azul');
  await expect(tv.getByRole('table', { name: 'Tablero' })).toHaveCount(0);
  expect(await tv.content()).not.toContain('Pregunta final secreta');

  await final.getByLabel('Apuesta de Equipo Rojo').fill('100');
  await final.getByRole('button', { name: 'Anotar apuesta de Equipo Rojo' }).click();
  await final.getByLabel('Apuesta de Equipo Azul').fill('50');
  await final.getByRole('button', { name: 'Anotar apuesta de Equipo Azul' }).click();
  await expect(tvFinal).toContainText('Apuestas anotadas: 2 de 2', { timeout: 1000 });
  expect(await tv.content()).not.toMatch(/apuesta (100|50)\b/);

  // Recargar el operador conserva las apuestas.
  await page.reload();
  await expect(final.getByRole('listitem', { name: 'Equipo Rojo' })).toContainText(
    'Apuesta anotada: 100',
  );
  await expect(final.getByRole('listitem', { name: 'Equipo Azul' })).toContainText(
    'Apuesta anotada: 50',
  );

  // Pista y temporizador: la música suena en el operador y la TV muestra la cuenta regresiva.
  await final.getByRole('button', { name: 'Mostrar pista' }).click();
  await expect(tvFinal.getByText('Pregunta final secreta')).toBeVisible({ timeout: 1000 });
  expect(await tv.content()).not.toContain('Respuesta final secreta');
  await final.getByRole('button', { name: 'Iniciar temporizador' }).click();
  await expect
    .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(false);
  await expect(tv.getByRole('timer', { name: 'Tiempo restante' })).toHaveText(/^(30|29|28)$/, {
    timeout: 1000,
  });

  // Revelación en orden: primero Rojo (100), luego Azul (200).
  await final.getByRole('button', { name: 'Pasar a la revelación' }).click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(tvFinal).toContainText('En turno: Equipo Rojo', { timeout: 1000 });
  await final
    .getByRole('region', { name: 'En turno: Equipo Rojo' })
    .getByRole('button', { name: 'Acertó' })
    .click();
  await final
    .getByRole('region', { name: 'En turno: Equipo Azul' })
    .getByRole('button', { name: 'Falló' })
    .click();
  for (const window of [page, tv]) {
    await expect(score(window, 'Equipo Rojo', 200)).toBeVisible({ timeout: 1000 });
    await expect(score(window, 'Equipo Azul', 150)).toBeVisible();
    await expect(score(window, 'Equipo Verde', 0)).toBeVisible();
  }
  await expect(tv.getByRole('list', { name: 'Resultados del Final' })).toContainText(
    'Equipo Azul: falló · apuesta 50 · 150 puntos',
  );

  await final.getByRole('button', { name: 'Mostrar respuesta en la TV' }).click();
  await expect(tvFinal.getByRole('region', { name: 'Respuesta' })).toHaveText(
    'Respuesta final secreta',
    { timeout: 1000 },
  );

  await final.getByRole('button', { name: 'Ir al podio' }).click();
  for (const window of [page, tv]) {
    const podium = window.getByRole('list', { name: 'Podio' });
    await expect(
      podium.getByRole('listitem', { name: 'Posición 1: Equipo Rojo, 200 puntos' }),
    ).toBeVisible({ timeout: 1000 });
    await expect(
      podium.getByRole('listitem', { name: 'Posición 2: Equipo Azul, 150 puntos' }),
    ).toBeVisible();
    await expect(
      podium.getByRole('listitem', { name: 'Posición 3: Equipo Verde, 0 puntos' }),
    ).toBeVisible();
  }
});
