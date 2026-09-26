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
