import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isDeviceServerMessage,
  type DeviceClientMessage,
  type DeviceServerMessage,
} from './protocol';
import {
  createWebSocketTransport,
  type WebSocketLike,
  type WsTransportOptions,
  type WsTransportStatus,
} from './wsTransport';

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  onopen: WebSocketLike['onopen'] = null;
  onclose: WebSocketLike['onclose'] = null;
  onerror: WebSocketLike['onerror'] = null;
  onmessage: WebSocketLike['onmessage'] = null;
  sent: string[] = [];
  closed = false;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  // Simulación del lado del servidor.
  serverOpen() {
    this.readyState = 1;
    this.onopen?.({});
  }

  serverSend(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }

  serverClose() {
    this.readyState = 3;
    this.onclose?.({});
  }
}

const last = () => FakeWebSocket.instances.at(-1)!;
let statuses: WsTransportStatus[];

function create(extra: Partial<WsTransportOptions<DeviceServerMessage>> = {}) {
  return createWebSocketTransport<DeviceServerMessage, DeviceClientMessage>('ws://lan/ws', {
    isMessage: isDeviceServerMessage,
    WebSocketImpl: FakeWebSocket,
    onStatus: (status) => statuses.push(status),
    ...extra,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  statuses = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createWebSocketTransport', () => {
  it('se conecta a la URL e informa connecting y open', () => {
    create();
    expect(last().url).toBe('ws://lan/ws');
    expect(statuses).toEqual(['connecting']);
    last().serverOpen();
    expect(statuses).toEqual(['connecting', 'open']);
  });

  it('entrega los mensajes válidos y filtra los inválidos', () => {
    const transport = create();
    const received: DeviceServerMessage[] = [];
    transport.subscribe((msg) => received.push(msg));
    last().serverOpen();
    last().serverSend({ type: 'welcome', serverTime: 123 });
    last().serverSend({ type: 'state', view: {} });
    last().serverSend('no es json');
    last().serverSend({ type: 'ping', serverTime: 456 });
    expect(received).toEqual([
      { type: 'welcome', serverTime: 123 },
      { type: 'ping', serverTime: 456 },
    ]);
  });

  it('envía como JSON solo con la conexión abierta', () => {
    const transport = create();
    transport.send({ type: 'pong' });
    expect(last().sent).toEqual([]);
    last().serverOpen();
    transport.send({ type: 'join', deviceId: 'celu-1', label: 'Android' });
    expect(last().sent).toEqual(['{"type":"join","deviceId":"celu-1","label":"Android"}']);
  });

  it('se reconecta con espera creciente y reporta los estados', () => {
    create();
    last().serverOpen();
    last().serverClose();
    expect(statuses.at(-1)).toBe('reconnecting');

    const waits: number[] = [];
    for (let i = 0; i < 5; i++) {
      const count = FakeWebSocket.instances.length;
      let waited = 0;
      while (FakeWebSocket.instances.length === count) {
        vi.advanceTimersByTime(100);
        waited += 100;
      }
      waits.push(waited);
      last().serverClose();
    }
    expect(waits).toEqual([500, 1000, 2000, 5000, 5000]);

    // Al conectarse de nuevo, la espera vuelve a empezar.
    vi.advanceTimersByTime(5000);
    last().serverOpen();
    expect(statuses.at(-1)).toBe('open');
    last().serverClose();
    const count = FakeWebSocket.instances.length;
    vi.advanceTimersByTime(499);
    expect(FakeWebSocket.instances).toHaveLength(count);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(count + 1);
  });

  it('un error de conexión también reintenta', () => {
    create();
    last().onerror?.({});
    expect(statuses).toEqual(['connecting', 'reconnecting']);
    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('sin mensajes durante idleTimeoutMs da la conexión por perdida', () => {
    create({ idleTimeoutMs: 3000 });
    last().serverOpen();
    vi.advanceTimersByTime(2000);
    last().serverSend({ type: 'ping', serverTime: 456 });
    vi.advanceTimersByTime(2999);
    expect(statuses.at(-1)).toBe('open');
    vi.advanceTimersByTime(1);
    expect(statuses.at(-1)).toBe('reconnecting');
    expect(FakeWebSocket.instances[0]!.closed).toBe(true);
  });

  it('close detiene los reintentos', () => {
    const transport = create();
    last().serverOpen();
    last().serverClose();
    transport.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    const other = create();
    other.close();
    expect(last().closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
