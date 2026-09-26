import { afterEach, describe, expect, it, vi } from 'vitest';
import { channelName, isSyncMessage, type SyncMessage } from './protocol';
import {
  createBroadcastTransport,
  createMemoryBus,
  createMemoryTransportPair,
  type SyncTransport,
} from './transport';

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('isSyncMessage', () => {
  it('acepta los cuatro tipos del protocolo', () => {
    expect(isSyncMessage({ type: 'hello' })).toBe(true);
    expect(isSyncMessage({ type: 'ping' })).toBe(true);
    expect(isSyncMessage({ type: 'bye' })).toBe(true);
    expect(isSyncMessage({ type: 'state', view: {} })).toBe(true);
  });

  it('rechaza mensajes ajenos o mal formados', () => {
    expect(isSyncMessage(null)).toBe(false);
    expect(isSyncMessage('hello')).toBe(false);
    expect(isSyncMessage({ type: 'otro' })).toBe(false);
    expect(isSyncMessage({ type: 'state' })).toBe(false);
  });
});

describe('channelName', () => {
  it('usa el prefijo jeopardy: con el id de la sesión', () => {
    expect(channelName('sesion-1')).toBe('jeopardy:sesion-1');
  });
});

describe('createMemoryTransportPair', () => {
  it('entrega los mensajes de forma asíncrona al otro extremo', async () => {
    const [a, b] = createMemoryTransportPair();
    const received: SyncMessage[] = [];
    b.subscribe((msg) => received.push(msg));

    a.send({ type: 'ping' });
    expect(received).toEqual([]);

    await flushMicrotasks();
    expect(received).toEqual([{ type: 'ping' }]);
  });

  it('no hace eco al emisor', async () => {
    const [a] = createMemoryTransportPair();
    const handler = vi.fn();
    a.subscribe(handler);

    a.send({ type: 'hello' });
    await flushMicrotasks();

    expect(handler).not.toHaveBeenCalled();
  });

  it('entrega una copia del mensaje, no la misma referencia', async () => {
    const [a, b] = createMemoryTransportPair();
    const received: SyncMessage[] = [];
    b.subscribe((msg) => received.push(msg));
    const msg = { type: 'hello' } as const;

    a.send(msg);
    await flushMicrotasks();

    expect(received[0]).toEqual(msg);
    expect(received[0]).not.toBe(msg);
  });

  it('deja de entregar tras desuscribirse o cerrar', async () => {
    const bus = createMemoryBus();
    const a = bus.connect();
    const b = bus.connect();
    const c = bus.connect();
    const onB = vi.fn();
    const onC = vi.fn();
    const unsubscribe = b.subscribe(onB);
    c.subscribe(onC);

    unsubscribe();
    c.close();
    a.send({ type: 'ping' });
    await flushMicrotasks();

    expect(onB).not.toHaveBeenCalled();
    expect(onC).not.toHaveBeenCalled();
  });
});

describe('createBroadcastTransport', () => {
  const opened: SyncTransport[] = [];
  const open = (sessionId: string) => {
    const transport = createBroadcastTransport(sessionId);
    opened.push(transport);
    return transport;
  };

  afterEach(() => {
    for (const transport of opened.splice(0)) transport.close();
  });

  const nextMessage = (transport: SyncTransport) =>
    new Promise<SyncMessage>((resolve) => {
      const unsubscribe = transport.subscribe((msg) => {
        unsubscribe();
        resolve(msg);
      });
    });

  it('comunica dos extremos de la misma sesión', async () => {
    const operator = open('sesion-a');
    const tv = open('sesion-a');
    const received = nextMessage(tv);

    operator.send({ type: 'ping' });

    await expect(received).resolves.toEqual({ type: 'ping' });
  });

  it('no mezcla sesiones distintas', async () => {
    const operator = open('sesion-a');
    const otherTv = open('sesion-b');
    const tv = open('sesion-a');
    const onOther = vi.fn();
    otherTv.subscribe(onOther);
    const received = nextMessage(tv);

    operator.send({ type: 'bye' });

    await expect(received).resolves.toEqual({ type: 'bye' });
    expect(onOther).not.toHaveBeenCalled();
  });

  it('ignora mensajes que no son del protocolo', async () => {
    const tv = open('sesion-c');
    const operator = open('sesion-c');
    const handler = vi.fn();
    tv.subscribe(handler);
    const received = nextMessage(tv);

    const raw = new BroadcastChannel(channelName('sesion-c'));
    raw.postMessage({ type: 'desconocido' });
    raw.close();
    operator.send({ type: 'hello' });

    await expect(received).resolves.toEqual({ type: 'hello' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
