import { chromium, expect, test } from '@playwright/test';
import { seedCompleteBoard } from '../e2e/helpers/seed';
import { desktopDirs, launchDesktop } from './helpers/app';

const LAN_PORT = 47590;

test('la TV muestra el QR a pedido del operador y un celular se conecta por la red local', async () => {
  const { app, operator } = await launchDesktop(desktopDirs(), { lanPort: LAN_PORT });
  const board = await seedCompleteBoard(operator);
  await operator.evaluate((id) => {
    window.location.hash = `#/boards/${id}/play`;
  }, board.id);
  await operator.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await operator.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await expect(operator.getByRole('checkbox', { name: 'Usar pulsadores' })).toBeChecked();
  await operator.getByRole('button', { name: 'Comenzar juego' }).click();

  const tvOpened = app.waitForEvent('window');
  await operator.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await tvOpened;
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();
  const joinQr = tv.getByRole('region', { name: 'Unirse con el celular' });
  await expect(joinQr).toHaveCount(0);

  // El operador pide el QR y la TV lo muestra con la dirección, que usa el puerto real.
  await operator.getByRole('button', { name: 'Mostrar QR en la TV' }).click();
  await expect(joinQr).toBeVisible({ timeout: 1000 });
  await expect(joinQr.getByRole('img', { name: /^Código QR de http:\/\// })).toBeVisible();
  await expect(joinQr.getByTestId('lan-url')).toContainText(`:${LAN_PORT}/`);

  await operator.getByRole('button', { name: 'Conectar dispositivos' }).click();
  const panel = operator.getByRole('dialog', { name: 'Conectar dispositivos' });
  await expect(panel.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible();
  // El operador no ve el QR ni la dirección.
  await expect(panel.getByTestId('lan-url')).toHaveCount(0);
  await expect(panel.getByRole('img', { name: /Código QR/ })).toHaveCount(0);

  // El "celular" es un Chromium aparte que abre la dirección por la red local.
  const browser = await chromium.launch();
  try {
    // 127.0.0.1 cuenta como contexto seguro, a diferencia de http://IP en un celular real.
    const phone = await browser.newPage({ serviceWorkers: 'block' });
    await phone.goto(`http://127.0.0.1:${LAN_PORT}/`);
    await expect(phone).toHaveURL(/#\/unirse$/);
    await expect(phone.getByRole('status')).toHaveText('Conectado a la fiesta');
    await expect(panel.getByRole('heading', { name: 'Dispositivos conectados: 1' })).toBeVisible({
      timeout: 2000,
    });

    // Una recarga cuenta como el mismo dispositivo.
    await phone.reload();
    await expect(phone.getByRole('status')).toHaveText('Conectado a la fiesta');
    await expect(panel.getByRole('heading', { name: 'Dispositivos conectados: 1' })).toBeVisible();
    await expect(
      panel.getByRole('list', { name: 'Dispositivos conectados' }).getByRole('listitem'),
    ).toHaveCount(1);

    // Al cerrar la página, deja de figurar en menos de 2 s.
    await phone.close();
    await expect(panel.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible({
      timeout: 2000,
    });
  } finally {
    await browser.close();
  }
  await panel.getByRole('button', { name: 'Cerrar' }).click();

  // Al recargar, la TV vuelve a mostrar el QR sin que el operador haga nada.
  await tv.reload();
  await expect(joinQr.getByTestId('lan-url')).toContainText(`:${LAN_PORT}/`);

  await operator.getByRole('button', { name: 'Ocultar QR de la TV' }).click();
  await expect(joinQr).toHaveCount(0, { timeout: 1000 });
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  // Cerrar la app detiene el servidor de la red local.
  await app.close();
  const probe = await chromium.launch();
  try {
    const page = await probe.newPage();
    await expect(page.goto(`http://127.0.0.1:${LAN_PORT}/`)).rejects.toThrow();
  } finally {
    await probe.close();
  }
});
