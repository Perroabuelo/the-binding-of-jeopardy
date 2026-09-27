import { beforeEach, describe, expect, it } from 'vitest';
import { createDeviceHub, type ConnectedDevice, type DeviceHub } from './hub';
import type { DeviceServerMessage } from './protocol';

let now: number;
let sent: { socketId: string; msg: DeviceServerMessage }[];
let kicked: string[];
let changes: ConnectedDevice[][];
let hub: DeviceHub;

beforeEach(() => {
  now = 1_000;
  sent = [];
  kicked = [];
  changes = [];
  hub = createDeviceHub({
    now: () => now,
    send: (socketId, msg) => sent.push({ socketId, msg }),
    kick: (socketId) => kicked.push(socketId),
    onChange: (devices) => changes.push(devices),
  });
});

function join(socketId: string, deviceId = 'celu-1', label = 'Android') {
  hub.message(socketId, { type: 'join', deviceId, label });
}

describe('createDeviceHub', () => {
  it('con join, el dispositivo aparece en la lista', () => {
    hub.connect('s1');
    expect(hub.devices()).toEqual([]);
    join('s1');
    const expected = [{ deviceId: 'celu-1', label: 'Android', connectedAt: 1_000 }];
    expect(hub.devices()).toEqual(expected);
    expect(changes.at(-1)).toEqual(expected);
  });

  it('welcome trae serverTime', () => {
    hub.connect('s1');
    now = 5_432;
    join('s1');
    expect(sent).toEqual([{ socketId: 's1', msg: { type: 'welcome', serverTime: 5_432 } }]);
  });

  it('un join con el mismo deviceId (recarga) deja uno solo y reemplaza el socket', () => {
    hub.connect('s1');
    join('s1');
    now = 2_000;
    hub.connect('s2');
    join('s2');
    expect(hub.devices()).toEqual([{ deviceId: 'celu-1', label: 'Android', connectedAt: 1_000 }]);
    expect(kicked).toEqual(['s1']);
    // El cierre del socket reemplazado no quita al dispositivo.
    hub.disconnect('s1');
    expect(hub.devices()).toHaveLength(1);
  });

  it('disconnect lo quita de inmediato', () => {
    hub.connect('s1');
    join('s1');
    hub.connect('s2');
    join('s2', 'celu-2', 'iPhone');
    hub.disconnect('s1');
    expect(hub.devices().map((device) => device.deviceId)).toEqual(['celu-2']);
    expect(changes.at(-1)).toEqual(hub.devices());
  });

  it('sin pong durante 4 s, tick lo expulsa', () => {
    hub.connect('s1');
    join('s1');
    hub.connect('s2');
    join('s2', 'celu-2', 'iPhone');
    for (let t = 1; t <= 3; t++) {
      now = 1_000 + t * 1_000;
      hub.tick();
      hub.message('s2', { type: 'pong' });
    }
    expect(hub.devices()).toHaveLength(2);
    now = 5_000;
    hub.tick();
    expect(kicked).toEqual(['s1']);
    expect(hub.devices().map((device) => device.deviceId)).toEqual(['celu-2']);
    expect(changes.at(-1)).toEqual(hub.devices());
  });

  it('tick envía ping cada segundo a los sockets conectados', () => {
    hub.connect('s1');
    now = 1_500;
    hub.tick();
    expect(sent).toEqual([]);
    now = 2_000;
    hub.tick();
    expect(sent).toEqual([{ socketId: 's1', msg: { type: 'ping', serverTime: 2_000 } }]);
  });

  it('los mensajes inválidos se ignoran', () => {
    hub.connect('s1');
    hub.message('s1', { type: 'join', deviceId: '', label: 'Android' });
    hub.message('s1', { type: 'otro' });
    hub.message('s1', 'basura');
    hub.message('desconocido', { type: 'join', deviceId: 'celu-9', label: 'Android' });
    expect(hub.devices()).toEqual([]);
    expect(changes).toEqual([]);
    expect(sent).toEqual([]);
    // Un mensaje inválido tampoco cuenta como señal de vida.
    now = 5_000;
    hub.tick();
    expect(kicked).toEqual(['s1']);
  });

  it('un socket sin join no aparece en la lista', () => {
    hub.connect('s1');
    hub.disconnect('s1');
    expect(changes).toEqual([]);
  });
});
