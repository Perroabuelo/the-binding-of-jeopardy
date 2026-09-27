import { isDeviceClientMessage, type DeviceServerMessage } from './protocol';

export const PING_INTERVAL_MS = 1000;
/** Sin respuesta durante este tiempo, el socket se da por perdido (p. ej. un celular bloqueado). */
export const DEVICE_TIMEOUT_MS = 4000;

export interface ConnectedDevice {
  deviceId: string;
  label: string;
  connectedAt: number;
}

export interface DeviceHubOptions {
  now(): number;
  send(socketId: string, msg: DeviceServerMessage): void;
  /** Cierra un socket desde el servidor (reemplazado o sin respuesta). */
  kick(socketId: string): void;
  onChange(devices: ConnectedDevice[]): void;
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
}

interface SocketState {
  lastSeen: number;
  deviceId: string | null;
}

/**
 * Máquina de estados de los dispositivos conectados, sin sockets reales: el reloj y la salida
 * vienen inyectados. Un `join` con un `deviceId` conocido reemplaza al socket anterior, así que
 * una recarga de la página cuenta como un solo dispositivo.
 */
export function createDeviceHub(options: DeviceHubOptions): DeviceHub {
  const pingIntervalMs = options.pingIntervalMs ?? PING_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEVICE_TIMEOUT_MS;
  const sockets = new Map<string, SocketState>();
  const devices = new Map<string, ConnectedDevice & { socketId: string }>();
  let lastPing = options.now();

  function list(): ConnectedDevice[] {
    return [...devices.values()]
      .map(({ deviceId, label, connectedAt }) => ({ deviceId, label, connectedAt }))
      .sort((a, b) => a.connectedAt - b.connectedAt);
  }

  function changed() {
    options.onChange(list());
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

  return {
    connect(socketId) {
      sockets.set(socketId, { lastSeen: options.now(), deviceId: null });
    },

    message(socketId, msg) {
      const socket = sockets.get(socketId);
      if (!socket || !isDeviceClientMessage(msg)) return;
      const now = options.now();
      socket.lastSeen = now;
      if (msg.type !== 'join') return;

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
      options.send(socketId, { type: 'welcome', serverTime: now });
      changed();
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
        for (const socketId of sockets.keys()) options.send(socketId, { type: 'ping' });
      }
      if (listChanged) changed();
    },

    devices: list,
  };
}
