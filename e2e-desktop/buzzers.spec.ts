import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import { WebSocket } from 'ws';
import { seedBoards } from '../e2e/helpers/seed';
import { makeCompleteBoard } from '../tests/fixtures/board';
import { desktopDirs, launchDesktop } from './helpers/app';

const LAN_PORT = 47610;
const FINAL = { category: 'Cumpleañero', question: 'Pregunta final', answer: 'Respuesta final' };

interface Phone {
  page: Page;
  /** Mensajes WebSocket que recibió, tal cual. */
  frames: string[];
}

/** Un "celular": un contexto propio de Chromium (su propio deviceId) que registra lo que recibe. */
async function openPhone(browser: Browser): Promise<Phone> {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const frames: string[] = [];
  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => frames.push(String(payload)));
  });
  await page.goto(`http://127.0.0.1:${LAN_PORT}/`);
  await expect(page.getByRole('status')).toHaveText('Conectado a la fiesta');
  return { page, frames };
}

async function joinTeam(phone: Phone, team: string) {
  await phone.page.getByRole('button', { name: team, exact: true }).click();
  await expect(phone.page.getByRole('heading', { name: `Equipo: ${team}` })).toBeVisible();
}

function buzzer(phone: Phone) {
  return phone.page.getByRole('button', { name: /^Pulsador:/ });
}

/**
 * Cliente WebSocket crudo unido a un equipo, para enviar mensajes que la página del celular ya no
 * permite (un segundo envío del Final del mismo equipo).
 */
async function rawClient(teamName: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${LAN_PORT}/ws`);
  const games: { teams: { id: string; name: string }[]; teamId?: string }[] = [];
  socket.on('message', (data) => {
    const msg = JSON.parse(String(data)) as { type: string; view?: (typeof games)[number] };
    if (msg.type === 'game' && msg.view) games.push(msg.view);
    if (msg.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }));
  });
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ type: 'join', deviceId: 'cliente-crudo', label: 'Crudo' }));
  await expect.poll(() => games.length).toBeGreaterThan(0);
  const teamId = games.at(-1)!.teams.find((team) => team.name === teamName)!.id;
  socket.send(JSON.stringify({ type: 'chooseTeam', teamId }));
  await expect.poll(() => games.at(-1)?.teamId).toBe(teamId);
  return {
    send: (msg: object) => socket.send(JSON.stringify(msg)),
    close: () => socket.terminate(),
  };
}

test('pulsadores y Final desde los celulares', async () => {
  test.setTimeout(120_000);
  const { app, operator } = await launchDesktop(desktopDirs(), { lanPort: LAN_PORT });
  const board = makeCompleteBoard({ id: 'e2e-pulsadores', final: { ...FINAL } }, 3);
  await seedBoards(operator, [board]);
  await operator.evaluate((id) => {
    window.location.hash = `#/boards/${id}/play`;
  }, board.id);
  await operator.getByLabel('Nombre del equipo 1').fill('Primos');
  await operator.getByLabel('Nombre del equipo 2').fill('Tíos');
  await expect(operator.getByRole('checkbox', { name: 'Usar pulsadores' })).toBeChecked();
  await operator.getByRole('button', { name: 'Comenzar juego' }).click();
  await expect(operator.getByRole('heading', { level: 1, name: 'Operador' })).toBeVisible();

  const tvOpened = app.waitForEvent('window');
  await operator.getByRole('button', { name: 'Abrir pantalla de TV' }).click();
  const tv = await tvOpened;
  await expect(tv.getByRole('table', { name: 'Tablero' })).toBeVisible();

  const browser = await chromium.launch();
  try {
    // 1. Cada celular elige su equipo y el operador lo ve en "Conectar dispositivos".
    const primos = await openPhone(browser);
    const tios = await openPhone(browser);
    await joinTeam(primos, 'Primos');
    await joinTeam(tios, 'Tíos');
    await operator.getByRole('button', { name: 'Conectar dispositivos' }).click();
    const devices = operator.getByRole('list', { name: 'Dispositivos conectados' });
    await expect(devices.getByRole('listitem')).toHaveText(
      ['Celular · Primos', 'Celular 2 · Tíos'],
      {
        timeout: 2000,
      },
    );
    await operator.getByRole('button', { name: 'Cerrar' }).click();

    // 2. Un toque antes de activar bloquea; activar; el primer toque gana.
    await operator.getByRole('button', { name: 'Categoría 1, 100' }).click();
    await expect(buzzer(primos)).toHaveAttribute('data-state', 'waiting');
    await buzzer(primos).click();
    await expect
      .poll(() => primos.frames.some((frame) => frame.includes('"lockedUntil"')))
      .toBe(true);
    await operator.getByRole('button', { name: 'Activar pulsadores' }).click();
    await expect(tv.getByRole('status')).toHaveText('¡Pulsadores activos!', { timeout: 1000 });
    await expect(buzzer(tios)).toHaveAttribute('data-state', 'armed', { timeout: 1000 });
    await buzzer(tios).click();
    await expect(operator.getByText('Responde: Tíos (Celular)')).toBeVisible();
    await expect(tv.getByRole('status')).toContainText('Responde: Tíos', { timeout: 1000 });
    await expect(buzzer(tios)).toHaveAttribute('data-state', 'won', { timeout: 1000 });
    await expect(buzzer(primos)).toHaveText(/Responde: Tíos/, { timeout: 1000 });

    // A los 5 s: "¡Tiempo!" en la TV, sin cambiar puntajes.
    await expect(tv.getByRole('timer', { name: 'Tiempo para responder' })).toHaveText('¡Tiempo!', {
      timeout: 7000,
    });
    await expect(operator.getByText('¡Tiempo!')).toBeVisible();
    await expect(operator.getByRole('listitem', { name: 'Tíos: 0 puntos' })).toBeVisible();

    // 3. Incorrecta resta y reabre para Primos, que gana; Correcta suma y la TV muestra quién elige.
    await operator.getByRole('button', { name: 'Incorrecta (−100)' }).click();
    await expect(operator.getByRole('listitem', { name: 'Tíos: -100 puntos' })).toBeVisible();
    await expect(buzzer(tios)).toHaveAttribute('data-state', 'failed', { timeout: 1000 });
    await expect(buzzer(primos)).toHaveAttribute('data-state', 'armed', { timeout: 1000 });
    await buzzer(primos).click();
    await expect(operator.getByText('Responde: Primos (Celular)')).toBeVisible();
    await operator.getByRole('button', { name: 'Correcta (+100)' }).click();
    await expect(operator.getByRole('listitem', { name: 'Primos: 100 puntos' })).toBeVisible();
    await expect(tv.getByText('Elige: Primos')).toBeVisible({ timeout: 1000 });

    // 4. Recargar un celular y el operador con un equipo respondiendo recupera el estado.
    await operator.getByRole('button', { name: 'Volver al tablero' }).click();
    await operator.getByRole('button', { name: 'Categoría 1, 200' }).click();
    await operator.getByRole('button', { name: 'Activar pulsadores' }).click();
    await primos.page.reload();
    await expect(primos.page.getByRole('heading', { name: 'Equipo: Primos' })).toBeVisible();
    await expect(buzzer(primos)).toHaveAttribute('data-state', 'armed', { timeout: 2000 });
    await expect(buzzer(tios)).toHaveAttribute('data-state', 'armed');
    await buzzer(tios).click();
    await expect(operator.getByText('Responde: Tíos (Celular)')).toBeVisible();
    await operator.reload();
    await expect(operator.getByText('Responde: Tíos (Celular)')).toBeVisible();
    await expect(buzzer(primos)).toHaveText(/Responde: Tíos/, { timeout: 2000 });
    await operator.getByRole('button', { name: 'Correcta (+200)' }).click();
    await expect(operator.getByRole('listitem', { name: 'Tíos: 100 puntos' })).toBeVisible();

    // Ningún mensaje de un celular con la pregunta abierta, respuestas, categorías ni puntajes.
    for (const phone of [primos, tios]) {
      const received = phone.frames.join('\n');
      expect(received).not.toMatch(/Pregunta|Respuesta|Categoría|Tablero de prueba/);
      expect(received).not.toMatch(/"score"/);
    }

    // 5. Final: apuestas y respuestas desde los celulares; el segundo envío del equipo no cuenta.
    await operator.getByRole('button', { name: 'Terminar juego' }).click();
    await operator.getByRole('button', { name: 'Sí, terminar' }).click();
    const final = operator.getByRole('region', { name: 'Final Jeopardy!' });
    await expect(final).toBeVisible();
    await expect(primos.page.getByText('Categoría: Cumpleañero')).toBeVisible({ timeout: 1000 });

    await primos.page.getByLabel('Apuesta de tu equipo').fill('57');
    await primos.page.getByRole('button', { name: 'Enviar apuesta' }).click();
    await expect(primos.page.getByText('Enviada por Celular: 57')).toBeVisible();
    await expect(final.getByRole('listitem', { name: 'Primos' })).toContainText(
      'Enviada desde Celular',
    );
    const second = await rawClient('Primos');
    second.send({ type: 'finalWager', amount: 99 });
    await tios.page.getByLabel('Apuesta de tu equipo').fill('43');
    await tios.page.getByRole('button', { name: 'Enviar apuesta' }).click();
    await expect(final.getByRole('listitem', { name: 'Tíos' })).toContainText(
      'Apuesta anotada: 43',
    );
    await expect(final.getByRole('listitem', { name: 'Primos' })).toContainText(
      'Apuesta anotada: 57',
    );

    await final.getByRole('button', { name: 'Mostrar pista' }).click();
    await final.getByRole('button', { name: 'Iniciar temporizador' }).click();
    await expect(primos.page.getByRole('timer', { name: 'Tiempo restante' })).toBeVisible();
    await primos.page.getByLabel('Respuesta de tu equipo').fill('¿Qué es un pastel?');
    await primos.page.getByRole('button', { name: 'Enviar respuesta' }).click();
    await expect(primos.page.getByText('Enviada por Celular: ¿Qué es un pastel?')).toBeVisible();
    second.send({ type: 'finalAnswer', text: 'Otra cosa' });
    await tios.page.getByLabel('Respuesta de tu equipo').fill('¿Qué es una torta?');
    await tios.page.getByRole('button', { name: 'Enviar respuesta' }).click();
    const answered = final.getByRole('list', { name: 'Respuestas desde los celulares' });
    await expect(answered).toContainText('Tíos: respondió');
    await expect(answered).toContainText('Primos: respondió');
    await expect(final).not.toContainText('¿Qué es un pastel?');
    second.close();

    // La revelación muestra la respuesta del equipo en turno en el operador y la TV.
    await final.getByRole('button', { name: 'Pasar a la revelación' }).click();
    const current = final.getByRole('region', { name: 'En turno: Primos' });
    await expect(current).toContainText('Respuesta enviada desde Celular: ¿Qué es un pastel?');
    await expect(tv.getByText('Respuesta de Primos: ¿Qué es un pastel?')).toBeVisible({
      timeout: 1000,
    });
    await expect(tv.getByText('¿Qué es una torta?')).toHaveCount(0);

    // 6. Ningún celular recibió datos del otro equipo.
    const primosFrames = primos.frames.join('\n');
    const tiosFrames = tios.frames.join('\n');
    expect(primosFrames).not.toMatch(/"amount":43|¿Qué es una torta\?/);
    expect(tiosFrames).not.toMatch(/"amount":57|¿Qué es un pastel\?|Otra cosa/);
    expect(primosFrames).not.toContain('Otra cosa');
    expect(primosFrames).not.toMatch(/Pregunta final|Respuesta final/);
  } finally {
    await browser.close();
  }
  await app.close();
});
