import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TvView } from '../domain/game';
import { createOperatorSync } from './operator';
import { OPERATOR_TIMEOUT_MS, PING_INTERVAL_MS, type SyncMessage } from './protocol';
import { createMemoryTransportPair, type SyncTransport } from './transport';
import { createTvSync } from './tv';

function makeView(overrides: Partial<TvView> = {}): TvView {
  return {
    sessionId: 'sesion-1',
    title: 'Tablero de prueba',
    categories: [
      {
        name: 'Categoría A',
        clues: [
          { key: 'c0-r0', value: 100, used: false },
          { key: 'c0-r1', value: 200, used: true },
        ],
      },
    ],
    teams: [
      { id: 'equipo-1', name: 'Equipo Rojo', score: 0 },
      { id: 'equipo-2', name: 'Equipo Azul', score: 200 },
    ],
    phase: { kind: 'board' },
    ...overrides,
  };
}

/** Deja correr las microtareas pendientes (entrega del bus en memoria). */
const flush = () => vi.advanceTimersByTimeAsync(0);

function record(transport: SyncTransport): SyncMessage[] {
  const messages: SyncMessage[] = [];
  transport.subscribe((msg) => messages.push(msg));
  return messages;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('constantes del protocolo', () => {
  it('usa ping cada 2 s y timeout de 10 s', () => {
    expect(PING_INTERVAL_MS).toBe(2000);
    expect(OPERATOR_TIMEOUT_MS).toBe(10000);
  });
});

describe('createOperatorSync', () => {
  it('responde a hello con el estado actual', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    let current = makeView();
    const operator = createOperatorSync(operatorSide, { getView: () => current });
    const received = record(tvSide);

    current = makeView({ title: 'Estado más reciente' });
    tvSide.send({ type: 'hello' });
    await flush();

    expect(received).toEqual([{ type: 'state', view: current }]);
    operator.dispose();
  });

  it('envía state en cada publish', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const operator = createOperatorSync(operatorSide, { getView: () => makeView() });
    const received = record(tvSide);
    const first = makeView();
    const second = makeView({ teams: [{ id: 'equipo-1', name: 'Equipo Rojo', score: 300 }] });

    operator.publish(first);
    operator.publish(second);
    await flush();

    expect(received).toEqual([
      { type: 'state', view: first },
      { type: 'state', view: second },
    ]);
    operator.dispose();
  });

  it('envía ping periódicamente', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const operator = createOperatorSync(operatorSide, { getView: () => makeView() });
    const received = record(tvSide);

    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS - 1);
    expect(received).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(received).toEqual([{ type: 'ping' }]);

    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS * 2);
    expect(received).toEqual([{ type: 'ping' }, { type: 'ping' }, { type: 'ping' }]);
    operator.dispose();
  });

  it('dispose envía bye, detiene el ping y deja de responder', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const operator = createOperatorSync(operatorSide, { getView: () => makeView() });
    const received = record(tvSide);

    operator.dispose();
    await flush();
    expect(received).toEqual([{ type: 'bye' }]);
    expect(vi.getTimerCount()).toBe(0);

    tvSide.send({ type: 'hello' });
    operator.publish(makeView());
    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS * 3);
    expect(received).toEqual([{ type: 'bye' }]);
  });
});

describe('createTvSync', () => {
  it('envía hello al iniciar', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const received = record(operatorSide);

    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting: vi.fn() });
    await flush();

    expect(received).toEqual([{ type: 'hello' }]);
    tv.dispose();
  });

  it('entrega cada vista recibida', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onView = vi.fn();
    const tv = createTvSync(tvSide, { onView, onWaiting: vi.fn() });
    const first = makeView();
    const second = makeView({ phase: { kind: 'finished', ranking: [] } });

    operatorSide.send({ type: 'state', view: first });
    operatorSide.send({ type: 'state', view: second });
    await flush();

    expect(onView).toHaveBeenNthCalledWith(1, first);
    expect(onView).toHaveBeenNthCalledWith(2, second);
    tv.dispose();
  });

  it('pasa a espera al recibir bye', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting });

    operatorSide.send({ type: 'state', view: makeView() });
    operatorSide.send({ type: 'bye' });
    await flush();

    expect(onWaiting).toHaveBeenCalledTimes(1);
    tv.dispose();
  });

  it('pasa a espera si pasan 10 s sin mensajes del operador', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting });

    operatorSide.send({ type: 'state', view: makeView() });
    await flush();
    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS - 1);
    expect(onWaiting).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onWaiting).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS * 2);
    expect(onWaiting).toHaveBeenCalledTimes(1);
    tv.dispose();
  });

  it('pasa a espera si nunca responde un operador', async () => {
    const [, tvSide] = createMemoryTransportPair();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting });

    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS);

    expect(onWaiting).toHaveBeenCalledTimes(1);
    tv.dispose();
  });

  it('el ping mantiene activa la conexión', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting });

    for (let i = 0; i < 10; i += 1) {
      await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS - 1000);
      operatorSide.send({ type: 'ping' });
    }
    await flush();

    expect(onWaiting).not.toHaveBeenCalled();
    tv.dispose();
  });

  it('el hello de otra TV no cuenta como actividad del operador', async () => {
    const [otherTvSide, tvSide] = createMemoryTransportPair();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting });

    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS - 1000);
    otherTvSide.send({ type: 'hello' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(onWaiting).toHaveBeenCalledTimes(1);
    tv.dispose();
  });

  it('sale de espera al volver a recibir state', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onView = vi.fn();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView, onWaiting });

    operatorSide.send({ type: 'bye' });
    await flush();
    expect(onWaiting).toHaveBeenCalledTimes(1);

    const view = makeView({ title: 'Operador de vuelta' });
    operatorSide.send({ type: 'state', view });
    await flush();
    expect(onView).toHaveBeenLastCalledWith(view);

    // Tras salir de espera vuelve a vigilar al operador.
    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS);
    expect(onWaiting).toHaveBeenCalledTimes(2);
    tv.dispose();
  });

  it('en espera, un ping del operador provoca un nuevo hello', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting: vi.fn() });
    operatorSide.send({ type: 'bye' });
    await flush();
    const received = record(operatorSide);

    operatorSide.send({ type: 'ping' });
    await flush();

    expect(received).toEqual([{ type: 'hello' }]);
    tv.dispose();
  });

  it('sin estado recibido, un ping del operador provoca un nuevo hello', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting: vi.fn() });
    await flush();
    const received = record(operatorSide);

    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS / 2);
    operatorSide.send({ type: 'ping' });
    await flush();

    expect(received).toEqual([{ type: 'hello' }]);
    tv.dispose();
  });

  it('con estado recibido, el ping no provoca hello', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const tv = createTvSync(tvSide, { onView: vi.fn(), onWaiting: vi.fn() });
    operatorSide.send({ type: 'state', view: makeView() });
    await flush();
    const received = record(operatorSide);

    operatorSide.send({ type: 'ping' });
    await flush();

    expect(received).toEqual([]);
    tv.dispose();
  });

  it('dispose limpia el timer y deja de entregar mensajes', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onView = vi.fn();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView, onWaiting });

    tv.dispose();
    expect(vi.getTimerCount()).toBe(0);

    operatorSide.send({ type: 'state', view: makeView() });
    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS * 2);
    expect(onView).not.toHaveBeenCalled();
    expect(onWaiting).not.toHaveBeenCalled();
  });
});

describe('operador y TV juntos', () => {
  it('la TV recibe el estado actual al iniciar y cada cambio posterior', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    let current = makeView();
    const operator = createOperatorSync(operatorSide, { getView: () => current });
    const onView = vi.fn();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView, onWaiting });

    await flush();
    expect(onView).toHaveBeenLastCalledWith(current);

    current = makeView({ teams: [{ id: 'equipo-1', name: 'Equipo Rojo', score: 100 }] });
    operator.publish(current);
    await flush();
    expect(onView).toHaveBeenLastCalledWith(current);

    // El ping del operador evita el timeout.
    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS * 3);
    expect(onWaiting).not.toHaveBeenCalled();

    operator.dispose();
    await flush();
    expect(onWaiting).toHaveBeenCalledTimes(1);
    tv.dispose();
  });

  it('la TV abierta antes que el operador recibe el estado sin cambios del operador', async () => {
    const [operatorSide, tvSide] = createMemoryTransportPair();
    const onView = vi.fn();
    const onWaiting = vi.fn();
    const tv = createTvSync(tvSide, { onView, onWaiting });
    await flush();

    // El operador se suscribe tarde (p. ej. tras cargar la sesión) y no publica nada.
    await vi.advanceTimersByTimeAsync(OPERATOR_TIMEOUT_MS / 2);
    const current = makeView({ title: 'Operador tardío' });
    const operator = createOperatorSync(operatorSide, { getView: () => current });
    expect(onView).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS);
    expect(onView).toHaveBeenCalledWith(current);
    expect(onWaiting).not.toHaveBeenCalled();

    operator.dispose();
    tv.dispose();
  });
});
