import { expect, test } from '@playwright/test';
import { desktopDirs, launchDesktop } from './helpers/app';

test('la app arranca con la lista de tableros y los conserva al reabrir', async () => {
  const dirs = desktopDirs();

  const first = await launchDesktop(dirs);
  await expect(first.operator).toHaveTitle('The Binding of Jeopardy');
  await first.operator.getByRole('button', { name: 'Nuevo tablero' }).click();
  await expect(first.operator.getByRole('heading', { name: 'Editar tablero' })).toBeVisible();
  await first.operator.getByLabel('Título del tablero').fill('Tablero de escritorio');
  // El editor guarda con debounce: se espera a que el guardado termine antes de cerrar.
  await expect(first.operator.getByText('Cambios guardados')).toBeVisible();
  await first.app.close();

  // Otro puerto de la red local: el origen app:// no cambia y los datos siguen ahí.
  const second = await launchDesktop(dirs, { lanPort: 47580 });
  await expect(second.operator.getByRole('link', { name: 'Tablero de escritorio' })).toBeVisible();
  await second.app.close();
});
