import { chromium, expect, test } from '@playwright/test';
import { desktopDirs, launchDesktop } from '../e2e-desktop/helpers/app';
import { capture } from './capture';

const LAN_PORT = 47650;

/**
 * Capturas de la app de escritorio: el QR en la TV para conectar celulares, el panel de
 * dispositivos, el celular como pulsador y la TV con los pulsadores activos. Requiere `npm run build:desktop` antes.
 */
test('conectar celulares y pulsadores en la app de escritorio', async () => {
  const { app, operator } = await launchDesktop(desktopDirs(), { lanPort: LAN_PORT });
  await operator.setViewportSize({ width: 1280, height: 800 });

  await operator.getByRole('button', { name: 'Crear desde ejemplo' }).click();
  await operator
    .getByRole('dialog', { name: 'Crear desde ejemplo' })
    .getByRole('button', { name: 'Música: K-pop' })
    .click();
  await operator.getByRole('link', { name: 'Música: K-pop' }).click();
  await operator.getByRole('button', { name: 'Jugar' }).click();
  await operator.getByLabel('Nombre del equipo 1').fill('Primos');
  await operator.getByLabel('Nombre del equipo 2').fill('Tíos');
  await expect(operator.getByRole('checkbox', { name: 'Usar pulsadores' })).toBeChecked();
  await operator.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(operator.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const tvOpened = app.waitForEvent('window');
  await operator.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await tvOpened;
  await tv.setViewportSize({ width: 1920, height: 1080 });
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  // El QR se captura a 1280x720, la resolución más baja de la TV, para ver que siga nítido.
  await operator.getByRole('button', { name: 'Mostrar QR en la TV' }).click();
  await tv.setViewportSize({ width: 1280, height: 720 });
  await expect(tv.getByTestId('lan-url')).toContainText(`:${LAN_PORT}/`);
  await capture(tv, 'tv-qr');
  await operator.getByRole('button', { name: 'Ocultar QR de la TV' }).click();
  await expect(tv.getByRole('region', { name: 'Unirse con el celular' })).toHaveCount(0);
  await tv.setViewportSize({ width: 1920, height: 1080 });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'es-CL',
    });
    const phone = await context.newPage();
    await phone.goto(`http://127.0.0.1:${LAN_PORT}/`);
    await expect(phone.getByRole('status')).toHaveText('Conectado a la fiesta');

    await phone.getByRole('button', { name: 'Primos', exact: true }).click();
    await expect(phone.getByRole('heading', { name: 'Equipo: Primos' })).toBeVisible();

    await operator.getByRole('button', { name: 'Conectar dispositivos' }).click();
    const panel = operator.getByRole('dialog', { name: 'Conectar dispositivos' });
    await expect(
      panel.getByRole('list', { name: 'Dispositivos conectados' }).getByRole('listitem'),
    ).toHaveText(['Celular · Primos']);
    // El aviso de red Pública depende de cómo esté configurado el equipo que genera las capturas;
    // en la captura se muestra el panel como se ve en una red privada.
    await panel
      .getByRole('alert')
      .filter({ hasText: 'marcada como' })
      .evaluateAll((alerts) => alerts.forEach((alert) => alert.remove()));
    await capture(operator, 'conectar-dispositivos');
    await operator.getByRole('button', { name: 'Cerrar' }).click();

    await operator.getByRole('button', { name: 'Canciones, 200', exact: true }).click();
    await operator.getByRole('button', { name: 'Activar pulsadores' }).click();
    const buzzer = phone.getByRole('button', { name: /^Pulsador:/ });
    await expect(buzzer).toHaveAttribute('data-state', 'armed');
    await expect(tv.getByRole('status')).toHaveText('¡Pulsadores activos!');
    await capture(phone, 'celular-pulsador');
    await capture(tv, 'tv-pulsadores');

    await buzzer.click();
    await expect(operator.getByText('Responde: Primos (Celular)')).toBeVisible();
    await capture(operator, 'operador-pulsadores');
  } finally {
    await browser.close();
    await app.close();
  }
});
