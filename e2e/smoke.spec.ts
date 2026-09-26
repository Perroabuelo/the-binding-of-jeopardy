import { expect, test } from '@playwright/test';

test('la app carga bajo la ruta base', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('The Binding of Jeopardy');
  await expect(page.getByRole('heading', { name: 'Hola' })).toBeVisible();
});
