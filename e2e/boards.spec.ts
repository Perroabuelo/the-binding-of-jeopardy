import { expect, test, type Page } from '@playwright/test';
import type { Board } from '../src/domain/board';
import { makeCompleteBoard } from '../tests/fixtures/board';
import { seedBoards, TINY_PNG_BASE64 } from './helpers/seed';

interface StoredState {
  boards: Board[];
  /** Imágenes como { type, base64 } por id. */
  images: Record<string, { type: string; base64: string }>;
}

/** Lee tableros e imágenes directo de IndexedDB. */
function readStorage(page: Page): Promise<StoredState> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('jeopardy');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const getAll = <T>(store: string) =>
      new Promise<{ key: IDBValidKey; value: T }[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const request = tx.objectStore(store).openCursor();
        const rows: { key: IDBValidKey; value: T }[] = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve(rows);
          rows.push({ key: cursor.key, value: cursor.value as T });
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
    const boards = (await getAll<Board>('boards')).map((row) => row.value);
    const images: Record<string, { type: string; base64: string }> = {};
    for (const row of await getAll<{ blob: Blob; type: string }>('images')) {
      const bytes = new Uint8Array(await row.value.blob.arrayBuffer());
      images[String(row.key)] = {
        type: row.value.type,
        base64: btoa(String.fromCharCode(...bytes)),
      };
    }
    db.close();
    return { boards, images };
  });
}

function boardWithImage(): Board {
  const board = makeCompleteBoard({ id: 'e2e-source', title: 'Trivia exportable' });
  board.categories[2]!.clues[3]!.imageId = 'e2e-image';
  return board;
}

async function openListWith(page: Page, boards: Board[]) {
  await page.goto('./');
  await seedBoards(page, boards, [{ id: 'e2e-image', base64: TINY_PNG_BASE64, type: 'image/png' }]);
  await page.reload();
  await expect(page.getByRole('list', { name: 'Tableros guardados' })).toBeVisible();
}

async function exportBoard(page: Page, title: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: `Exportar ${title}` }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${title}.jeopardy.json`);
  const path = test.info().outputPath(download.suggestedFilename());
  await download.saveAs(path);
  return path;
}

test('exportar e importar un tablero con imagen crea una copia idéntica', async ({ page }) => {
  const source = boardWithImage();
  await openListWith(page, [source]);

  const file = await exportBoard(page, 'Trivia exportable');
  await page.getByLabel('Importar tablero').setInputFiles(file);

  await expect(page.getByRole('status')).toHaveText('Se importó "Trivia exportable".');
  await expect(page.getByRole('link', { name: 'Trivia exportable' })).toHaveCount(2);

  const { boards, images } = await readStorage(page);
  expect(boards).toHaveLength(2);
  const imported = boards.find((board) => board.id !== source.id)!;
  expect(imported.title).toBe(source.title);
  const importedImageId = imported.categories[2]!.clues[3]!.imageId!;
  expect(importedImageId).not.toBe('e2e-image');
  // Mismo contenido salvo los ids de imagen, que son nuevos.
  const withoutImageIds = (board: Board) =>
    board.categories.map((category) => ({
      name: category.name,
      clues: category.clues.map(({ imageId: _imageId, ...clue }) => clue),
    }));
  expect(withoutImageIds(imported)).toEqual(withoutImageIds(source));
  expect(images[importedImageId]).toEqual({ type: 'image/png', base64: TINY_PNG_BASE64 });
  // El original no se modificó.
  expect(boards.find((board) => board.id === source.id)).toEqual(source);
  expect(images['e2e-image']).toEqual({ type: 'image/png', base64: TINY_PNG_BASE64 });
});

test('exportar e importar un tablero con imagen de respuesta crea una copia con esa imagen', async ({
  page,
}) => {
  const source = boardWithImage();
  source.categories[0]!.clues[4]!.answerImageId = 'e2e-image-respuesta';
  await page.goto('./');
  await seedBoards(
    page,
    [source],
    [
      { id: 'e2e-image', base64: TINY_PNG_BASE64, type: 'image/png' },
      { id: 'e2e-image-respuesta', base64: TINY_PNG_BASE64, type: 'image/png' },
    ],
  );
  await page.reload();

  const file = await exportBoard(page, 'Trivia exportable');
  await page.getByLabel('Importar tablero').setInputFiles(file);
  await expect(page.getByRole('status')).toHaveText('Se importó "Trivia exportable".');

  const { boards, images } = await readStorage(page);
  const imported = boards.find((board) => board.id !== source.id)!;
  const answerImageId = imported.categories[0]!.clues[4]!.answerImageId;
  expect(answerImageId).toBeDefined();
  expect(answerImageId).not.toBe('e2e-image-respuesta');
  expect(images[answerImageId!]).toEqual({ type: 'image/png', base64: TINY_PNG_BASE64 });
  expect(imported.categories[2]!.clues[3]!.imageId).not.toBe(answerImageId);

  // La copia muestra la imagen de la respuesta en el editor.
  await page.goto(`./#/boards/${imported.id}`);
  await page.getByRole('button', { name: 'Categoría 1, 500, completa' }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Categoría 1, 500' })
      .getByRole('img', { name: 'Vista previa de la imagen de la respuesta' }),
  ).toBeVisible();
});

test('importar un archivo inválido muestra un aviso y la lista no cambia', async ({ page }) => {
  await openListWith(page, [boardWithImage()]);
  const before = await readStorage(page);

  await page.getByLabel('Importar tablero').setInputFiles({
    name: 'no-es-tablero.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"otra-cosa"}'),
  });

  await expect(page.getByRole('alert')).toContainText('No se pudo importar el tablero.');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect(await readStorage(page)).toEqual(before);
});

test('importar el mismo archivo dos veces da dos tableros nuevos distintos', async ({ page }) => {
  const source = boardWithImage();
  await openListWith(page, [source]);
  const file = await exportBoard(page, 'Trivia exportable');

  const input = page.getByLabel('Importar tablero');
  await input.setInputFiles(file);
  await expect(page.getByRole('link', { name: 'Trivia exportable' })).toHaveCount(2);
  await input.setInputFiles(file);
  await expect(page.getByRole('link', { name: 'Trivia exportable' })).toHaveCount(3);

  const { boards, images } = await readStorage(page);
  expect(boards).toHaveLength(3);
  expect(new Set(boards.map((board) => board.id)).size).toBe(3);
  const imageIds = boards.map((board) => board.categories[2]!.clues[3]!.imageId!);
  expect(new Set(imageIds).size).toBe(3);
  for (const imageId of imageIds) expect(images[imageId]?.base64).toBe(TINY_PNG_BASE64);
  // Importar no sobrescribe el tablero existente.
  expect(boards.find((board) => board.id === source.id)).toEqual(source);
});

test('exportar e importar un tablero de 8 categorías crea una copia con el mismo orden', async ({
  page,
}) => {
  const source = makeCompleteBoard({ id: 'e2e-ocho', title: 'Trivia larga' }, 8);
  source.categories.forEach((category, c) => (category.name = `Columna ${8 - c}`));
  await openListWith(page, [source]);

  const file = await exportBoard(page, 'Trivia larga');
  await page.getByLabel('Importar tablero').setInputFiles(file);

  await expect(page.getByRole('status')).toHaveText('Se importó "Trivia larga".');
  const { boards } = await readStorage(page);
  const imported = boards.find((board) => board.id !== source.id)!;
  expect(imported.categories).toEqual(source.categories);

  await page.getByRole('link', { name: 'Trivia larga' }).last().click();
  const names = page.getByLabel(/^Nombre de la categoría \d$/);
  await expect(names).toHaveCount(8);
  expect(await names.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))).toEqual(
    source.categories.map((category) => category.name),
  );
});

test('importar un tablero de 9 categorías muestra la estructura permitida', async ({ page }) => {
  await openListWith(page, [boardWithImage()]);
  const before = await readStorage(page);
  const nine = makeCompleteBoard({ id: 'e2e-nueve' }, 9);

  await page.getByLabel('Importar tablero').setInputFiles({
    name: 'nueve.jeopardy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'the-binding-of-jeopardy',
        schemaVersion: 1,
        board: nine,
        images: {},
      }),
    ),
  });

  await expect(page.getByRole('alert')).toContainText(
    'debe tener entre 3 y 8 categorías con 5 preguntas de 100 a 500',
  );
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect(await readStorage(page)).toEqual(before);
});

test('exportar e importar un tablero con Daily Double conserva las celdas marcadas', async ({
  page,
}) => {
  const source = makeCompleteBoard({ id: 'e2e-dd', title: 'Trivia con apuestas' });
  source.categories[0]!.clues[2]!.dailyDouble = true;
  source.categories[3]!.clues[4]!.dailyDouble = true;
  await openListWith(page, [source]);

  const file = await exportBoard(page, 'Trivia con apuestas');
  await page.getByLabel('Importar tablero').setInputFiles(file);

  await expect(page.getByRole('status')).toHaveText('Se importó "Trivia con apuestas".');
  const { boards } = await readStorage(page);
  const imported = boards.find((board) => board.id !== source.id)!;
  expect(imported.categories).toEqual(source.categories);

  await page.getByRole('link', { name: 'Trivia con apuestas' }).last().click();
  const marked = page.getByRole('button', { name: /, Daily Double$/ });
  await expect(marked).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Categoría 1, 300, completa, Daily Double' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Categoría 4, 500, completa, Daily Double' }),
  ).toBeVisible();
});

test('exportar e importar un tablero con pista final conserva sus textos e imagen', async ({
  page,
}) => {
  const source = makeCompleteBoard({
    id: 'e2e-final',
    title: 'Trivia con Final',
    final: {
      category: 'Cumpleañero',
      question: 'Pregunta final',
      answer: 'Respuesta final',
      imageId: 'e2e-image',
    },
  });
  await openListWith(page, [source]);

  const file = await exportBoard(page, 'Trivia con Final');
  await page.getByLabel('Importar tablero').setInputFiles(file);
  await expect(page.getByRole('status')).toHaveText('Se importó "Trivia con Final".');

  const { boards, images } = await readStorage(page);
  const imported = boards.find((board) => board.id !== source.id)!;
  expect(imported.final).toMatchObject({
    category: 'Cumpleañero',
    question: 'Pregunta final',
    answer: 'Respuesta final',
  });
  expect(imported.final!.imageId).not.toBe('e2e-image');
  expect(images[imported.final!.imageId!]).toEqual({ type: 'image/png', base64: TINY_PNG_BASE64 });

  await page.getByRole('link', { name: 'Trivia con Final' }).last().click();
  const section = page.getByRole('region', { name: 'Pista final' });
  await expect(section.getByLabel('Categoría de la pista final')).toHaveValue('Cumpleañero');
  await expect(
    section.getByRole('img', { name: 'Vista previa de la imagen de la pregunta final' }),
  ).toBeVisible();
  await expect(page.getByText('Pista final: completa.')).toBeVisible();
});
