import { expect, test } from '@playwright/test';
import { seedCompleteBoard } from './helpers/seed';

test('la app carga bajo la ruta base', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('The Binding of Jeopardy');
  await expect(page.getByRole('heading', { name: 'Tableros' })).toBeVisible();
});

test('los tableros sembrados aparecen en la lista', async ({ page }) => {
  await page.goto('./');
  await seedCompleteBoard(page);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Tablero de prueba' })).toBeVisible();
});

test('crear un tablero abre el editor', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nuevo tablero' }).click();
  await expect(page.getByRole('heading', { name: 'Editar tablero' })).toBeVisible();
  await expect(page).toHaveURL(/#\/boards\/[^/]+$/);
});
