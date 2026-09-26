import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedCompleteBoard } from './helpers/seed';

const SW_PATH = join(process.cwd(), 'dist', 'sw.js');

// Este archivo prueba el service worker: se habilita (los demás e2e lo bloquean).
test.use({ serviceWorkers: 'allow' });

test('después de cargar con red, la app funciona completa sin conexión', async ({
  page,
  context,
}) => {
  await page.goto('./');
  // Espera a que el service worker quede activo, con todo el build precacheado.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const board = await seedCompleteBoard(page);

  await context.setOffline(true);

  // Abrir sin red: la app carga y muestra los tableros guardados.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Tableros' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tablero de prueba' })).toBeVisible();

  // Jugar sin red: operador y TV funcionan y se sincronizan.
  await page.goto(`./#/boards/${board.id}/play`);
  await page.getByLabel('Nombre del equipo 1').fill('Equipo Rojo');
  await page.getByLabel('Nombre del equipo 2').fill('Equipo Azul');
  await page.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await popup;
  await expect(tv.getByRole('heading', { name: 'Tablero de prueba' })).toBeVisible();

  await page.getByRole('button', { name: 'Categoría 1, 100' }).click();
  await expect(tv.getByText('Pregunta 1-1')).toBeVisible();
  await page.getByRole('button', { name: 'Revelar respuesta' }).click();
  await expect(tv.getByText('Respuesta 1-1')).toBeVisible();
});

test.describe.configure({ mode: 'serial' });

test('una versión nueva se activa al volver a abrir la app, sin perder los tableros', async ({
  context,
}) => {
  const page = await context.newPage();
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await seedCompleteBoard(page);

  // Simula una nueva publicación: el sw.js cambia y responde con su versión a un mensaje.
  // vite preview lee dist/ del disco en cada petición.
  const original = readFileSync(SW_PATH, 'utf8');
  writeFileSync(
    SW_PATH,
    `${original}
self.addEventListener('message', (event) => {
  if (event.data === 'version?') event.ports[0].postMessage('v2');
});`,
  );
  try {
    // Con la app abierta la versión nueva se instala pero queda en espera: no interrumpe un juego.
    const waiting = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration!.update();
      const worker = registration!.installing ?? registration!.waiting;
      if (worker && worker.state !== 'installed') {
        await new Promise<void>((resolve) =>
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') resolve();
          }),
        );
      }
      return registration!.waiting !== null;
    });
    expect(waiting).toBe(true);

    // Se cierran todas las pestañas y se vuelve a abrir la app con conexión.
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto('./');

    const version = await reopened.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const active = registration!.active!;
      return new Promise<string>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data as string);
        active.postMessage('version?', [channel.port2]);
        setTimeout(() => resolve('v1'), 2000);
      });
    });
    expect(version).toBe('v2');
    await expect(reopened.getByRole('link', { name: 'Tablero de prueba' })).toBeVisible();
  } finally {
    writeFileSync(SW_PATH, original);
  }
});
