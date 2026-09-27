import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { importBoard } from '../src/domain/exchange';
import { makeCompleteBoard } from '../tests/fixtures/board';
import { seedBoards, TINY_PNG_BASE64 } from '../e2e/helpers/seed';
import { desktopDirs, launchDesktop } from './helpers/app';

const listFiles = (folder: string) =>
  existsSync(folder)
    ? readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    : [];

test('un tablero se respalda en disco al guardarlo y pasa a eliminados al borrarlo', async () => {
  const dirs = desktopDirs();
  const { app, operator } = await launchDesktop(dirs);

  // Un tablero listo, con imagen, sembrado en el almacenamiento de la app.
  const source = makeCompleteBoard({ id: 'e2e-respaldo', title: 'Trivia respaldada' });
  source.categories[0]!.clues[0]!.imageId = 'e2e-imagen';
  await seedBoards(
    operator,
    [source],
    [{ id: 'e2e-imagen', base64: TINY_PNG_BASE64, type: 'image/png' }],
  );
  await operator.reload();

  // Guardarlo desde el editor lo respalda (al salir del editor se escribe sin esperar).
  await operator.getByRole('link', { name: 'Trivia respaldada' }).click();
  await operator.getByLabel('Título del tablero').fill('Trivia en disco');
  await expect(operator.getByText('Cambios guardados')).toBeVisible();
  await operator.getByRole('link', { name: '← Tableros' }).click();
  await expect(operator.getByRole('link', { name: 'Trivia en disco' })).toBeVisible();

  const fileName = 'Trivia en disco (e2e-resp).jeopardy.json';
  await expect.poll(() => listFiles(dirs.backupDir), { timeout: 10_000 }).toEqual([fileName]);

  // El respaldo es un archivo de exportación: importarlo crea un tablero equivalente.
  const json = readFileSync(path.join(dirs.backupDir, fileName), 'utf8');
  let n = 0;
  const { board, images } = importBoard(json, { makeId: () => `nuevo-${++n}`, now: 0 });
  expect(board.title).toBe('Trivia en disco');
  expect(board.categories.map((category) => category.name)).toEqual(
    source.categories.map((category) => category.name),
  );
  const importedImageId = board.categories[0]!.clues[0]!.imageId!;
  expect(images[importedImageId]).toBe(`data:image/png;base64,${TINY_PNG_BASE64}`);

  // Eliminarlo mueve el respaldo a eliminados.
  await operator.getByRole('button', { name: 'Eliminar Trivia en disco' }).click();
  await operator
    .getByRole('dialog', { name: 'Eliminar tablero' })
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect.poll(() => listFiles(dirs.backupDir)).toEqual([]);
  await expect.poll(() => listFiles(path.join(dirs.backupDir, 'eliminados'))).toEqual([fileName]);

  // Ofrece abrir la carpeta de respaldos.
  await expect(operator.getByRole('button', { name: 'Abrir carpeta de respaldos' })).toBeVisible();
  await app.close();
});
