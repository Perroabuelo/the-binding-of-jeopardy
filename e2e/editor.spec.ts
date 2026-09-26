import { expect, test } from '@playwright/test';

test('los cambios del editor se conservan al recargar', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await expect(page.getByRole('heading', { name: 'Editar tablero' })).toBeVisible();

  await page.getByLabel('Título del tablero').fill('Noche de trivia');
  await page.getByLabel('Nombre de la categoría 1').fill('Historia familiar');

  await page.getByRole('button', { name: 'Categoría 2, 300, incompleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Categoría 2, 300' });
  await dialog.getByLabel('Pregunta').fill('¿Cuál es el planeta más grande?');
  await dialog.getByLabel('Respuesta').fill('Júpiter');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');

  await page.reload();

  await expect(page.getByLabel('Título del tablero')).toHaveValue('Noche de trivia');
  await expect(page.getByLabel('Nombre de la categoría 1')).toHaveValue('Historia familiar');
  await page.getByRole('button', { name: 'Categoría 2, 300, completa' }).click();
  await expect(dialog.getByLabel('Pregunta')).toHaveValue('¿Cuál es el planeta más grande?');
  await expect(dialog.getByLabel('Respuesta')).toHaveValue('Júpiter');
});
