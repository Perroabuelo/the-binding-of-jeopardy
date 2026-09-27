import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { DeviceGameView } from '../src/domain/deviceProjection';
import { createDeviceHub, type ConnectedDevice } from '../src/net/hub';
import { isDeviceClientMessage, parseMessage, type DeviceEvent } from '../src/net/protocol';
import { mimeType, resolveStaticPath } from './static';

export const PREFERRED_LAN_PORT = 47470;
export const LAN_PORT_COUNT = 10;
export const WS_PATH = '/ws';
const TICK_MS = 500;
/** Los mensajes de los celulares son diminutos: nada más grande se acepta. */
const MAX_MESSAGE_BYTES = 4096;

/** Rango fijo de puertos a probar: el preferido y los siguientes. */
export function portCandidates(preferred = PREFERRED_LAN_PORT, count = LAN_PORT_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => preferred + i);
}

/** Devuelve el primer puerto en el que `tryListen` logra escuchar, o `null` si ninguno. */
export async function pickPort(
  candidates: readonly number[],
  tryListen: (port: number) => Promise<boolean>,
): Promise<number | null> {
  for (const port of candidates) {
    if (await tryListen(port)) return port;
  }
  return null;
}

export interface LanServerOptions {
  /** Carpeta `dist/` con el build de la app. */
  distDir: string;
  /** `SITE_BASE`: los archivos se sirven solo bajo esta ruta. */
  base: string;
  ports: readonly number[];
  host?: string;
  onDevices(devices: ConnectedDevice[]): void;
  /** Toques y envíos del Final de los celulares, en orden de llegada. */
  onDeviceEvent?(event: DeviceEvent): void;
  now?: () => number;
}

export interface LanServer {
  /** `null` si no hubo ningún puerto libre en el rango. */
  port: number | null;
  devices(): ConnectedDevice[];
  /** Estado del juego para los celulares (proyección del operador); null sin juego. */
  publishGame(view: DeviceGameView | null): void;
  close(): Promise<void>;
}

function listenOn(server: Server, port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const onError = () => {
      server.off('listening', onListening);
      resolve(false);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(true);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(text);
}

/**
 * Servidor de la red local: sirve los archivos de la app y la conexión de dispositivos por
 * WebSocket. No tiene ningún endpoint de datos: los tableros y el juego viven en el
 * almacenamiento de la app, que este servidor no lee. A los celulares solo les llega la
 * proyección que publica el operador (`publishGame`), repartida por equipo en el hub.
 */
export async function startLanServer(options: LanServerOptions): Promise<LanServer> {
  const { distDir, base } = options;
  const host = options.host ?? '0.0.0.0';
  const now = options.now ?? Date.now;

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return sendText(res, 405, 'Método no permitido');
    let pathname: string;
    try {
      pathname = new URL(req.url ?? '/', 'http://lan').pathname;
    } catch {
      return sendText(res, 400, 'Petición inválida');
    }
    if (pathname === '/') {
      res.writeHead(302, { Location: `${base}#/unirse`, 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }
    const file = resolveStaticPath(distDir, base, pathname);
    if (!file) return sendText(res, 404, 'No encontrado');
    let body: Buffer;
    try {
      body = await readFile(file);
    } catch {
      return sendText(res, 404, 'No encontrado');
    }
    const headers: Record<string, string> = {
      'Content-Type': mimeType(file),
      'Content-Length': String(body.length),
      'X-Content-Type-Options': 'nosniff',
    };
    // Así un celular no queda con una versión vieja de la página.
    if (file.endsWith('index.html')) headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  }

  const server = createServer((req, res) => {
    handleRequest(req, res).catch(() => {
      if (!res.headersSent) sendText(res, 500, 'Error');
      else res.destroy();
    });
  });

  const sockets = new Map<string, WebSocket>();
  let nextSocketId = 0;
  const hub = createDeviceHub({
    now,
    send(socketId, msg) {
      sockets.get(socketId)?.send(JSON.stringify(msg));
    },
    kick(socketId) {
      const socket = sockets.get(socketId);
      sockets.delete(socketId);
      socket?.terminate();
    },
    onChange: options.onDevices,
    onDeviceEvent: (event) => options.onDeviceEvent?.(event),
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  wss.on('connection', (socket: WebSocket) => {
    const socketId = `s${++nextSocketId}`;
    sockets.set(socketId, socket);
    hub.connect(socketId);
    socket.on('message', (data: RawData, isBinary: boolean) => {
      if (isBinary) return;
      const msg = parseMessage(String(data), isDeviceClientMessage);
      if (msg) hub.message(socketId, msg);
    });
    socket.on('close', () => {
      if (sockets.get(socketId) === socket) sockets.delete(socketId);
      hub.disconnect(socketId);
    });
    socket.on('error', () => socket.terminate());
  });

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let pathname = '';
    try {
      pathname = new URL(req.url ?? '/', 'http://lan').pathname;
    } catch {
      // Se rechaza abajo.
    }
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  const port = await pickPort(options.ports, (candidate) => listenOn(server, candidate, host));
  const timer = port === null ? null : setInterval(() => hub.tick(), TICK_MS);
  timer?.unref();

  let closing: Promise<void> | null = null;
  return {
    port,
    devices: () => hub.devices(),
    publishGame: (view) => hub.publishGame(view),
    close() {
      closing ??= new Promise<void>((resolve) => {
        if (timer) clearInterval(timer);
        for (const socket of sockets.values()) socket.terminate();
        sockets.clear();
        wss.close();
        if (!server.listening) return resolve();
        server.close(() => resolve());
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
