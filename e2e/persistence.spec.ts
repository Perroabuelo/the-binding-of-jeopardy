import { chromium, expect, test, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLUE_VALUES } from '../src/domain/board';
import { seedCompleteBoard, TINY_PNG_BASE64 } from './helpers/seed';

test('crear un tablero nuevo muestra 5 categorías vacías con celdas de 100 a 500', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await expect(page.getByRole('heading', { name: 'Editar tablero' })).toBeVisible();

  await expect(page.getByRole('button', { name: /^Categoría \d+, \d+, / })).toHaveCount(25);
  for (let c = 1; c <= 5; c++) {
    await expect(page.getByLabel(`Nombre de la categoría ${c}`)).toHaveValue('');
    const labels = await page
      .getByRole('button', { name: new RegExp(`^Categoría ${c}, `) })
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    expect(labels).toEqual(CLUE_VALUES.map((v) => `Categoría ${c}, ${v}, incompleta`));
  }
});

test('abrir un tablero de la lista muestra su contenido en el editor', async ({ page }) => {
  await page.goto('./');
  await seedCompleteBoard(page);
  await page.reload();

  await page.getByRole('link', { name: 'Tablero de prueba' }).click();

  await expect(page.getByLabel('Título del tablero')).toHaveValue('Tablero de prueba');
  await expect(page.getByLabel('Nombre de la categoría 3')).toHaveValue('Categoría 3');
  await page.getByRole('button', { name: 'Categoría 3, 200, completa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 3, 200' });
  await expect(dialog.getByLabel('Pregunta', { exact: true })).toHaveValue('Pregunta 3-2');
  await expect(dialog.getByLabel('Respuesta', { exact: true })).toHaveValue('Respuesta 3-2');
});

/** Crea desde la UI un tablero con título, una categoría, una celda y una imagen. */
async function createBoardWithImage(page: Page) {
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await page.getByLabel('Título del tablero').fill('Noche de trivia');
  await page.getByLabel('Nombre de la categoría 1').fill('Planetas');
  await page.getByRole('button', { name: 'Categoría 1, 100, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 1, 100' });
  await dialog.getByLabel('Pregunta', { exact: true }).fill('¿Cuál es el planeta más grande?');
  await dialog.getByLabel('Respuesta', { exact: true }).fill('Júpiter');
  await dialog.getByLabel('Imagen de la pregunta').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la pregunta' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');
}

test('los tableros siguen disponibles tras cerrar y volver a abrir el navegador', async () => {
  const baseURL = test.info().project.use.baseURL!;
  const userDataDir = mkdtempSync(join(tmpdir(), 'jeopardy-e2e-'));
  const launch = () =>
    chromium.launchPersistentContext(userDataDir, { baseURL, serviceWorkers: 'block' });
  try {
    const first = await launch();
    const page = first.pages()[0] ?? (await first.newPage());
    await page.goto('./');
    await createBoardWithImage(page);
    await first.close();

    const second = await launch();
    const reopened = second.pages()[0] ?? (await second.newPage());
    await reopened.goto('./');
    await reopened.getByRole('link', { name: 'Noche de trivia' }).click();
    await expect(reopened.getByLabel('Nombre de la categoría 1')).toHaveValue('Planetas');
    await reopened.getByRole('button', { name: 'Categoría 1, 100, completa' }).click();
    const dialog = reopened.getByRole('dialog', { name: 'Categoría 1, 100' });
    await expect(dialog.getByLabel('Respuesta', { exact: true })).toHaveValue('Júpiter');
    await expect(
      dialog.getByRole('img', { name: 'Vista previa de la imagen de la pregunta' }),
    ).toBeVisible();
    await second.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});

test('crear, editar y guardar un tablero no envía datos por la red', async ({ page }) => {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const requests: { method: string; url: string; body: string | null }[] = [];
  page.on('request', (request) => {
    requests.push({ method: request.method(), url: request.url(), body: request.postData() });
  });

  await page.goto('./');
  await createBoardWithImage(page);
  await page.getByRole('link', { name: '← Tableros' }).click();
  await expect(page.getByRole('link', { name: 'Noche de trivia' })).toBeVisible();

  const offending = requests.filter(
    (r) =>
      r.method !== 'GET' ||
      r.body !== null ||
      (!r.url.startsWith(origin) && !r.url.startsWith('blob:') && !r.url.startsWith('data:')) ||
      /trivia|J%C3%BApiter|Júpiter|Planetas/.test(r.url),
  );
  expect(offending).toEqual([]);
});
