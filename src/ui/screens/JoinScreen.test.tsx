import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DeviceClientMessage, DeviceServerMessage } from '../../net/protocol';
import type { WsTransportStatus } from '../../net/wsTransport';
import { DEVICE_ID_KEY } from '../lan/device';
import { JoinScreen, type CreateDeviceTransport, type DeviceTransport } from './JoinScreen';

/** Transporte falso: la prueba controla el estado de la conexión y los mensajes del servidor. */
function fakeTransport() {
  const sent: DeviceClientMessage[] = [];
  const handlers = new Set<(msg: DeviceServerMessage) => void>();
  let onStatus: (status: WsTransportStatus) => void = () => {};
  let closed = false;
  const transport: DeviceTransport = {
    send: (msg) => void sent.push(msg),
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
    close: () => {
      closed = true;
    },
  };
  const create: CreateDeviceTransport = (listener) => {
    onStatus = listener;
    listener('connecting');
    return transport;
  };
  return {
    create,
    sent,
    isClosed: () => closed,
    status: (status: WsTransportStatus) => act(() => onStatus(status)),
    receive: (msg: DeviceServerMessage) =>
      act(() => {
        for (const handler of [...handlers]) handler(msg);
      }),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('JoinScreen', () => {
  it('muestra "Conectando…" mientras se conecta', () => {
    const fake = fakeTransport();
    render(<JoinScreen createTransport={fake.create} />);
    expect(screen.getByRole('status')).toHaveTextContent('Conectando…');
  });

  it('se presenta con su deviceId guardado y muestra "Conectado a la fiesta"', () => {
    const fake = fakeTransport();
    render(<JoinScreen createTransport={fake.create} />);
    fake.status('open');
    const deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    expect(deviceId).toMatch(/^[0-9a-f]{32}$/);
    expect(fake.sent).toEqual([{ type: 'join', deviceId, label: expect.any(String) }]);

    fake.receive({ type: 'welcome', serverTime: 1 });
    expect(screen.getByRole('status')).toHaveTextContent('Conectado a la fiesta');

    // Responde los latidos.
    fake.receive({ type: 'ping', serverTime: 2 });
    expect(fake.sent.at(-1)).toEqual({ type: 'pong' });
  });

  it('muestra "Reconectando…" al perder la conexión y vuelve a conectarse solo', () => {
    const fake = fakeTransport();
    render(<JoinScreen createTransport={fake.create} />);
    fake.status('open');
    fake.receive({ type: 'welcome', serverTime: 1 });

    fake.status('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');

    fake.status('open');
    expect(fake.sent.filter((msg) => msg.type === 'join')).toHaveLength(2);
    fake.receive({ type: 'welcome', serverTime: 2 });
    expect(screen.getByRole('status')).toHaveTextContent('Conectado a la fiesta');
  });

  it('sin servidor indica que se abre desde el QR', () => {
    const fake = fakeTransport();
    render(<JoinScreen createTransport={fake.create} />);
    fake.status('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta página se abre escaneando el QR de la app de escritorio.',
    );
  });

  it('cierra la conexión al salir', () => {
    const fake = fakeTransport();
    const view = render(<JoinScreen createTransport={fake.create} />);
    view.unmount();
    expect(fake.isClosed()).toBe(true);
  });
});
