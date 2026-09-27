import type { DeviceGameView } from '../domain/deviceProjection';
import {
  isDeviceClientMessage,
  type DeviceEvent,
  type DeviceServerMessage,
  type PhoneView,
} from './protocol';

export const PING_INTERVAL_MS = 1000;
/** Sin respuesta durante este tiempo, el socket se da por perdido (p. ej. un celular bloqueado). */
export const DEVICE_TIMEOUT_MS = 4000;
/** Bloqueo de un celular que toca el pulsador antes de tiempo. */
export const BUZZ_LOCK_MS = 250;

export interface ConnectedDevice {
  deviceId: string;
  label: string;
  connectedAt: number;
  /** Equipo al que está unido, si eligió uno. */
  teamId?: string;
}

export interface DeviceHubOptions {
  now(): number;
  send(socketId: string, msg: DeviceServerMessage): void;
  /** Cierra un socket desde el servidor (reemplazado o sin respuesta). */
  kick(socketId: string): void;
  onChange(devices: ConnectedDevice[]): void;
  /** Un toque o un envío del Final que debe llegar al operador. */
  onDeviceEvent?(event: DeviceEvent): void;
  pingIntervalMs?: number;
  timeoutMs?: number;
}

export interface DeviceHub {
  connect(socketId: string): void;
  /** Recibe un mensaje ya interpretado; los mensajes inválidos se ignoran. */
  message(socketId: string, msg: unknown): void;
  disconnect(socketId: string): void;
  /** Envía los latidos y expulsa los sockets que no responden. Se llama periódicamente. */
  tick(): void;
  devices(): ConnectedDevice[];
  /** Estado del juego publicado por el operador; null sin un juego con pulsadores en curso. */
  publishGame(view: DeviceGameView | null): void;
}

interface SocketState {
  lastSeen: number;
  deviceId: string | null;
}

interface DeviceState {
  deviceId: string;
  label: string;
  connectedAt: number;
  socketId: string;
}

/**
 * Máquina de estados de los dispositivos conectados, sin sockets reales: el reloj y la salida
 * vienen inyectados. Un `join` con un `deviceId` conocido reemplaza al socket anterior, así que
 * una recarga de la página cuenta como un solo dispositivo.
 *
 * Con un juego publicado, lleva el equipo de cada dispositivo y el bloqueo por tocar antes de
 * tiempo, y envía a cada socket solo lo común y lo de su propio equipo.
 */
export function createDeviceHub(options: DeviceHubOptions): DeviceHub {
  const pingIntervalMs = options.pingIntervalMs ?? PING_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEVICE_TIMEOUT_MS;
  const sockets = new Map<string, SocketState>();
  const devices = new Map<string, DeviceState>();
  /** Equipo de cada dispositivo. Se conserva aunque se desconecte o no haya juego publicado. */
  const teams = new Map<string, string>();
  const lockedUntil = new Map<string, number>();
  let game: DeviceGameView | null = null;
  let lastPing = options.now();

  function list(): ConnectedDevice[] {
    return [...devices.values()]
      .map(({ deviceId, label, connectedAt }) => {
        const teamId = teams.get(deviceId);
        return { deviceId, label, connectedAt, ...(teamId !== undefined && { teamId }) };
      })
      .sort((a, b) => a.connectedAt - b.connectedAt);
  }

  function changed() {
    options.onChange(list());
  }

  function teamExists(teamId: string): boolean {
    return game?.common.teams.some((team) => team.id === teamId) ?? false;
  }

  function viewFor(deviceId: string): PhoneView | null {
    if (!game) return null;
    const teamId = teams.get(deviceId);
    const team = teamId !== undefined ? game.perTeam[teamId] : undefined;
    const locked = lockedUntil.get(deviceId);
    return {
      ...game.common,
      ...(teamId !== undefined && { teamId }),
      ...(team && { team }),
      ...(locked !== undefined && locked > options.now() && { lockedUntil: locked }),
      ...(game.answeringDeviceId === deviceId && { youWon: true }),
    };
  }

  function sendGame(deviceId: string): void {
    const device = devices.get(deviceId);
    if (device) options.send(device.socketId, { type: 'game', view: viewFor(deviceId) });
  }

  /** Olvida el socket; si tenía un dispositivo, lo quita. Devuelve si cambió la lista. */
  function drop(socketId: string): boolean {
    const socket = sockets.get(socketId);
    if (!socket) return false;
    sockets.delete(socketId);
    const device = socket.deviceId ? devices.get(socket.deviceId) : undefined;
    if (device && device.socketId === socketId) {
      devices.delete(device.deviceId);
      return true;
    }
    return false;
  }

  function buzz(device: DeviceState, teamId: string): void {
    const now = options.now();
    if (now < (lockedUntil.get(device.deviceId) ?? 0)) return;
    const state = game?.common.buzz;
    if (state?.status !== 'armed') {
      // Antes de tiempo (o con otro equipo respondiendo): solo este celular queda bloqueado
      lockedUntil.set(device.deviceId, now + BUZZ_LOCK_MS);
      sendGame(device.deviceId);
      return;
    }
    if (state.failedTeamIds.includes(teamId)) return;
    options.onDeviceEvent?.({
      type: 'buzz',
      deviceId: device.deviceId,
      deviceLabel: device.label,
      teamId,
    });
  }

  return {
    connect(socketId) {
      sockets.set(socketId, { lastSeen: options.now(), deviceId: null });
    },

    message(socketId, msg) {
      const socket = sockets.get(socketId);
      if (!socket || !isDeviceClientMessage(msg)) return;
      const now = options.now();
      socket.lastSeen = now;

      if (msg.type === 'join') {
        const previous = devices.get(msg.deviceId);
        if (previous && previous.socketId !== socketId) {
          // El socket anterior del mismo dispositivo (p. ej. antes de recargar) queda reemplazado.
          sockets.delete(previous.socketId);
          options.kick(previous.socketId);
        }
        if (socket.deviceId && socket.deviceId !== msg.deviceId) devices.delete(socket.deviceId);
        socket.deviceId = msg.deviceId;
        devices.set(msg.deviceId, {
          deviceId: msg.deviceId,
          label: msg.label.trim(),
          connectedAt: previous?.connectedAt ?? now,
          socketId,
        });
        // Recupera el equipo guardado en el celular. Sin juego publicado todavía (p. ej. tras
        // reiniciar la app) se conserva y se valida cuando el operador publique.
        if (msg.teamId !== undefined && (!game || teamExists(msg.teamId))) {
          teams.set(msg.deviceId, msg.teamId);
        }
        options.send(socketId, { type: 'welcome', serverTime: now });
        sendGame(msg.deviceId);
        changed();
        return;
      }

      const device = socket.deviceId ? devices.get(socket.deviceId) : undefined;
      if (!device || device.socketId !== socketId) return;

      if (msg.type === 'chooseTeam') {
        if (!teamExists(msg.teamId)) return;
        teams.set(device.deviceId, msg.teamId);
        sendGame(device.deviceId);
        changed();
        return;
      }

      const teamId = teams.get(device.deviceId);
      if (teamId === undefined || !game) return;
      const source = { deviceId: device.deviceId, deviceLabel: device.label, teamId };
      switch (msg.type) {
        case 'buzz':
          buzz(device, teamId);
          break;
        case 'finalWager':
          options.onDeviceEvent?.({ type: 'finalWager', ...source, amount: msg.amount });
          break;
        case 'finalAnswer':
          options.onDeviceEvent?.({ type: 'finalAnswer', ...source, text: msg.text });
          break;
      }
    },

    disconnect(socketId) {
      if (drop(socketId)) changed();
    },

    tick() {
      const now = options.now();
      let listChanged = false;
      for (const [socketId, socket] of [...sockets]) {
        if (now - socket.lastSeen >= timeoutMs) {
          listChanged = drop(socketId) || listChanged;
          options.kick(socketId);
        }
      }
      if (now - lastPing >= pingIntervalMs) {
        lastPing = now;
        for (const socketId of sockets.keys()) {
          options.send(socketId, { type: 'ping', serverTime: now });
        }
      }
      if (listChanged) changed();
    },

    devices: list,

    publishGame(view) {
      game = view;
      let teamsChanged = false;
      if (game) {
        // Un equipo que no existe en el juego publicado (p. ej. de un juego anterior) se olvida
        for (const [deviceId, teamId] of [...teams]) {
          if (!teamExists(teamId)) {
            teams.delete(deviceId);
            teamsChanged = true;
          }
        }
      }
      for (const deviceId of devices.keys()) sendGame(deviceId);
      if (teamsChanged) changed();
    },
  };
}
