import { beforeEach, describe, expect, it } from 'vitest';
import { createDeviceHub, type ConnectedDevice, type DeviceHub } from './hub';
import type { DeviceGameView } from '../domain/deviceProjection';
import type { DeviceEvent, DeviceServerMessage } from './protocol';

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
    expect(sent).toEqual([
      { socketId: 's1', msg: { type: 'welcome', serverTime: 5_432 } },
      // Sin juego publicado, el celular espera.
      { socketId: 's1', msg: { type: 'game', view: null } },
    ]);
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

describe('createDeviceHub: pulsadores', () => {
  let events: DeviceEvent[];

  beforeEach(() => {
    events = [];
    hub = createDeviceHub({
      now: () => now,
      send: (socketId, msg) => sent.push({ socketId, msg }),
      kick: (socketId) => kicked.push(socketId),
      onChange: (devices) => changes.push(devices),
      onDeviceEvent: (event) => events.push(event),
    });
  });

  function gameView(
    buzz?: NonNullable<DeviceGameView['common']['buzz']>,
    extra: Partial<DeviceGameView> = {},
  ): DeviceGameView {
    return {
      common: {
        sessionId: 'g1',
        teams: [
          { id: 'primos', name: 'Primos' },
          { id: 'tios', name: 'Tíos' },
        ],
        stage: buzz ? 'clue' : 'board',
        ...(buzz && { buzz }),
      },
      perTeam: { primos: {}, tios: {} },
      ...extra,
    };
  }

  const ARMED = { status: 'armed' as const, failedTeamIds: [] };
  const CLOSED = { status: 'closed' as const, failedTeamIds: [] };

  /** Último `game` enviado a un socket. */
  function lastView(socketId: string) {
    const games = sent.filter(
      (entry): entry is { socketId: string; msg: Extract<DeviceServerMessage, { type: 'game' }> } =>
        entry.socketId === socketId && entry.msg.type === 'game',
    );
    return games.at(-1)?.msg.view;
  }

  function joinTeam(socketId: string, deviceId: string, teamId: string, label = deviceId) {
    hub.connect(socketId);
    hub.message(socketId, { type: 'join', deviceId, label });
    hub.message(socketId, { type: 'chooseTeam', teamId });
  }

  it('chooseTeam con un equipo existente lo guarda y lo muestra en la lista', () => {
    hub.publishGame(gameView());
    joinTeam('s1', 'celu-1', 'primos', 'Android');
    expect(hub.devices()).toEqual([
      { deviceId: 'celu-1', label: 'Android', connectedAt: 1_000, teamId: 'primos' },
    ]);
    expect(changes.at(-1)).toEqual(hub.devices());
    expect(lastView('s1')).toMatchObject({ teamId: 'primos', team: {} });
  });

  it('chooseTeam con un equipo inexistente o sin juego se ignora', () => {
    hub.connect('s1');
    join('s1');
    hub.message('s1', { type: 'chooseTeam', teamId: 'primos' });
    expect(hub.devices()[0]).not.toHaveProperty('teamId');
    hub.publishGame(gameView());
    hub.message('s1', { type: 'chooseTeam', teamId: 'nadie' });
    expect(hub.devices()[0]).not.toHaveProperty('teamId');
  });

  it('se puede cambiar de equipo', () => {
    hub.publishGame(gameView());
    joinTeam('s1', 'celu-1', 'primos');
    hub.message('s1', { type: 'chooseTeam', teamId: 'tios' });
    expect(hub.devices()[0]!.teamId).toBe('tios');
  });

  it('join con teamId recupera el equipo si existe, y si no lo ignora', () => {
    hub.publishGame(gameView());
    hub.connect('s1');
    hub.message('s1', { type: 'join', deviceId: 'celu-1', label: 'A', teamId: 'tios' });
    expect(hub.devices()[0]!.teamId).toBe('tios');
    hub.connect('s2');
    hub.message('s2', { type: 'join', deviceId: 'celu-2', label: 'B', teamId: 'de-otro-juego' });
    expect(hub.devices()[1]).not.toHaveProperty('teamId');
  });

  it('join con teamId antes de publicar se valida al publicar', () => {
    hub.connect('s1');
    hub.message('s1', { type: 'join', deviceId: 'celu-1', label: 'A', teamId: 'tios' });
    hub.connect('s2');
    hub.message('s2', { type: 'join', deviceId: 'celu-2', label: 'B', teamId: 'viejo' });
    hub.publishGame(gameView());
    expect(hub.devices().map((device) => device.teamId)).toEqual(['tios', undefined]);
    expect(lastView('s1')).toMatchObject({ teamId: 'tios' });
    expect(lastView('s2')).not.toHaveProperty('teamId');
  });

  it('publishGame(null) conserva los equipos y envía view: null', () => {
    hub.publishGame(gameView());
    joinTeam('s1', 'celu-1', 'primos');
    hub.publishGame(null);
    expect(lastView('s1')).toBeNull();
    hub.publishGame(gameView());
    expect(lastView('s1')).toMatchObject({ teamId: 'primos' });
  });

  it('un buzz antes de armar bloquea 250 ms y no se reenvía', () => {
    hub.publishGame(gameView(CLOSED));
    joinTeam('s1', 'celu-1', 'primos');
    now = 2_000;
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([]);
    expect(lastView('s1')).toMatchObject({ lockedUntil: 2_250 });
  });

  it('un buzz durante el bloqueo no se reenvía aunque ya esté armado', () => {
    hub.publishGame(gameView(CLOSED));
    joinTeam('s1', 'celu-1', 'primos');
    now = 2_000;
    hub.message('s1', { type: 'buzz' });
    hub.publishGame(gameView(ARMED));
    now = 2_249;
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([]);
    now = 2_250;
    hub.message('s1', { type: 'buzz' });
    expect(events).toHaveLength(1);
  });

  it('otro dispositivo del mismo equipo no queda bloqueado', () => {
    hub.publishGame(gameView(CLOSED));
    joinTeam('s1', 'celu-1', 'primos');
    joinTeam('s2', 'celu-2', 'primos', 'iPhone');
    hub.message('s1', { type: 'buzz' });
    hub.publishGame(gameView(ARMED));
    expect(lastView('s1')).toMatchObject({ lockedUntil: 1_250 });
    expect(lastView('s2')).not.toHaveProperty('lockedUntil');
    hub.message('s1', { type: 'buzz' });
    hub.message('s2', { type: 'buzz' });
    expect(events).toEqual([
      { type: 'buzz', deviceId: 'celu-2', deviceLabel: 'iPhone', teamId: 'primos' },
    ]);
  });

  it('un buzz sin equipo se ignora', () => {
    hub.publishGame(gameView(ARMED));
    hub.connect('s1');
    join('s1');
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([]);
  });

  it('un buzz armado se reenvía con el equipo y la etiqueta del registro', () => {
    hub.publishGame(gameView(ARMED));
    joinTeam('s1', 'celu-1', 'tios', 'Android 2');
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([
      { type: 'buzz', deviceId: 'celu-1', deviceLabel: 'Android 2', teamId: 'tios' },
    ]);
  });

  it('un buzz de un equipo que ya falló no se reenvía ni bloquea', () => {
    hub.publishGame(gameView({ status: 'armed', failedTeamIds: ['tios'] }));
    joinTeam('s1', 'celu-1', 'tios');
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([]);
    expect(lastView('s1')).not.toHaveProperty('lockedUntil');
  });

  it('cada socket recibe solo el perTeam de su equipo', () => {
    const view = gameView(undefined, {
      perTeam: {
        primos: { final: { participating: true, maxWager: 800, wager: { amount: 500 } } },
        tios: {
          final: {
            participating: true,
            maxWager: 300,
            answer: { text: 'Secreto', deviceLabel: 'X' },
          },
        },
      },
    });
    hub.publishGame(view);
    joinTeam('s1', 'celu-1', 'primos');
    joinTeam('s2', 'celu-2', 'tios');
    hub.connect('s3');
    hub.message('s3', { type: 'join', deviceId: 'celu-3', label: 'Sin equipo' });
    hub.publishGame(view);
    expect(lastView('s1')).toMatchObject({ team: view.perTeam.primos });
    const primos = JSON.stringify(sent.filter((entry) => entry.socketId === 's1'));
    const tios = JSON.stringify(sent.filter((entry) => entry.socketId === 's2'));
    const sinEquipo = JSON.stringify(sent.filter((entry) => entry.socketId === 's3'));
    expect(primos).not.toMatch(/Secreto|300/);
    expect(tios).not.toMatch(/500|800/);
    expect(sinEquipo).not.toMatch(/Secreto|300|500|800/);
    expect(lastView('s3')).not.toHaveProperty('team');
  });

  it('youWon sale solo para el dispositivo ganador y nunca el answeringDeviceId', () => {
    hub.publishGame(gameView());
    joinTeam('s1', 'celu-1', 'tios');
    joinTeam('s2', 'celu-2', 'tios');
    joinTeam('s3', 'celu-3', 'primos');
    hub.publishGame(
      gameView(
        { status: 'answering', answeringTeamId: 'tios', answerEndsAt: 6_000, failedTeamIds: [] },
        { answeringDeviceId: 'celu-1' },
      ),
    );
    expect(lastView('s1')).toMatchObject({ youWon: true });
    expect(lastView('s1')!.buzz).toMatchObject({ answeringTeamId: 'tios', answerEndsAt: 6_000 });
    expect(lastView('s2')).not.toHaveProperty('youWon');
    expect(lastView('s3')).not.toHaveProperty('youWon');
    expect(JSON.stringify(sent)).not.toContain('answeringDeviceId');
  });

  it('un buzz con otro equipo respondiendo bloquea y no se reenvía', () => {
    hub.publishGame(gameView({ status: 'answering', answeringTeamId: 'tios', failedTeamIds: [] }));
    joinTeam('s1', 'celu-1', 'primos');
    hub.message('s1', { type: 'buzz' });
    expect(events).toEqual([]);
    expect(lastView('s1')).toMatchObject({ lockedUntil: 1_250 });
  });

  it('finalWager y finalAnswer se reenvían con el equipo del registro', () => {
    hub.publishGame(gameView());
    joinTeam('s1', 'celu-1', 'primos', 'Android');
    hub.message('s1', { type: 'finalWager', amount: 500 });
    hub.message('s1', { type: 'finalAnswer', text: '¿Qué es un pastel?' });
    expect(events).toEqual([
      {
        type: 'finalWager',
        deviceId: 'celu-1',
        deviceLabel: 'Android',
        teamId: 'primos',
        amount: 500,
      },
      {
        type: 'finalAnswer',
        deviceId: 'celu-1',
        deviceLabel: 'Android',
        teamId: 'primos',
        text: '¿Qué es un pastel?',
      },
    ]);
  });

  it('los envíos de un celular sin equipo o de un socket reemplazado se ignoran', () => {
    hub.publishGame(gameView(ARMED));
    hub.connect('s1');
    join('s1');
    hub.message('s1', { type: 'finalWager', amount: 1 });
    joinTeam('s2', 'celu-2', 'primos');
    // Recarga: s3 reemplaza a s2
    hub.connect('s3');
    hub.message('s3', { type: 'join', deviceId: 'celu-2', label: 'celu-2' });
    hub.message('s2', { type: 'buzz' });
    expect(events).toEqual([]);
    hub.message('s3', { type: 'buzz' });
    expect(events).toHaveLength(1);
  });
});
