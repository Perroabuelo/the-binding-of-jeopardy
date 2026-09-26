import { expect, test } from '@playwright/test';
import { TINY_PNG_BASE64 } from './helpers/seed';

test('los cambios del editor se conservan al recargar', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await expect(page.getByRole('heading', { name: 'Editar tablero' })).toBeVisible();

  await page.getByLabel('Título del tablero').fill('Noche de trivia');
  await page.getByLabel('Nombre de la categoría 1').fill('Historia familiar');

  await page.getByRole('button', { name: 'Categoría 2, 300, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 2, 300' });
  await dialog.getByLabel('Pregunta', { exact: true }).fill('¿Cuál es el planeta más grande?');
  await dialog.getByLabel('Respuesta', { exact: true }).fill('Júpiter');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.reload();

  await expect(page.getByLabel('Título del tablero')).toHaveValue('Noche de trivia');
  await expect(page.getByLabel('Nombre de la categoría 1')).toHaveValue('Historia familiar');
  await page.getByRole('button', { name: 'Categoría 2, 300, completa' }).click();
  await expect(dialog.getByLabel('Pregunta', { exact: true })).toHaveValue(
    '¿Cuál es el planeta más grande?',
  );
  await expect(dialog.getByLabel('Respuesta', { exact: true })).toHaveValue('Júpiter');
});

test('la imagen de una pregunta se conserva al recargar', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await page.getByRole('button', { name: 'Categoría 1, 100, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 1, 100' });
  await dialog.getByLabel('Imagen de la pregunta').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la pregunta' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.reload();

  await page.getByRole('button', { name: 'Categoría 1, 100, incompleta' }).click();
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la pregunta' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Quitar imagen de la pregunta' }).click();
  await expect(dialog.getByRole('img')).toHaveCount(0);
});

test('la imagen de una respuesta se conserva al recargar', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await page.getByRole('button', { name: 'Categoría 1, 100, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 1, 100' });
  await dialog.getByLabel('Imagen de la respuesta').setInputFiles({
    name: 'respuesta.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la respuesta' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.reload();

  await page.getByRole('button', { name: 'Categoría 1, 100, incompleta' }).click();
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la respuesta' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('img', { name: 'Vista previa de la imagen de la pregunta' }),
  ).toHaveCount(0);
});

test('agregar, mover y quitar categorías se conserva al recargar', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  const names = page.getByLabel(/^Nombre de la categoría \d$/);
  await expect(names).toHaveCount(6);

  await page.getByLabel('Nombre de la categoría 1').fill('Historia familiar');
  await page.getByLabel('Nombre de la categoría 2').fill('Geografía');
  await page.getByLabel('Nombre de la categoría 3').fill('Cine');
  await page.getByRole('button', { name: 'Categoría 1, 200, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 1, 200' });
  await dialog.getByLabel('Pregunta', { exact: true }).fill('¿Dónde nació la abuela?');
  await dialog.getByLabel('Respuesta', { exact: true }).fill('En Valparaíso');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('button', { name: 'Agregar categoría' }).click();
  await expect(names).toHaveCount(7);
  await page.getByLabel('Nombre de la categoría 7').fill('Música');

  await page.getByRole('button', { name: 'Mover categoría 1 a la derecha' }).click();
  await expect(page.getByLabel('Nombre de la categoría 1')).toHaveValue('Geografía');
  await expect(page.getByLabel('Nombre de la categoría 2')).toHaveValue('Historia familiar');

  await page.getByRole('button', { name: 'Quitar categoría 3' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Quitar la categoría Cine?' });
  await confirm.getByRole('button', { name: 'Quitar' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(names).toHaveCount(6);
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.reload();

  await expect(names).toHaveCount(6);
  expect(await names.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))).toEqual(
    ['Geografía', 'Historia familiar', '', '', '', 'Música'],
  );
  await page.getByRole('button', { name: 'Categoría 2, 200, completa' }).click();
  const moved = page.getByRole('dialog', { name: 'Categoría 2, 200' });
  await expect(moved.getByLabel('Pregunta', { exact: true })).toHaveValue(
    '¿Dónde nació la abuela?',
  );
  await expect(moved.getByLabel('Respuesta', { exact: true })).toHaveValue('En Valparaíso');
});
