import { chromium, expect, test } from '@playwright/test';
import { seedCompleteBoard } from '../e2e/helpers/seed';
import { desktopDirs, launchDesktop } from './helpers/app';

const LAN_PORT = 47590;

test('un celular se conecta por la red local y aparece en el operador', async () => {
  const { app, operator } = await launchDesktop(desktopDirs(), { lanPort: LAN_PORT });
  const board = await seedCompleteBoard(operator);
  await operator.evaluate((id) => {
    window.location.hash = `#/boards/${id}/play`;
  }, board.id);
  await operator.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await operator.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await operator.getByRole('button', { name: 'Comenzar juego' }).click();

  await operator.getByRole('button', { name: 'Conectar dispositivos' }).click();
  const panel = operator.getByRole('dialog', { name: 'Conectar dispositivos' });
  await expect(panel.getByRole('heading', { name: 'Dispositivos conectados: 0' })).toBeVisible();
  // La dirección usa el puerto real (el preferido estaba libre).
  await expect(panel.getByTestId('lan-url')).toContainText(`:${LAN_PORT}/`);

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
