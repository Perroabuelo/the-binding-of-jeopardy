import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ConnectedDevice } from '../src/net/hub';
import { isDeviceServerMessage } from '../src/net/protocol';
import { pickPort, portCandidates, startLanServer, type LanServer } from './lanServer';

const BASE = '/the-binding-of-jeopardy/';
let distDir: string;
let root: string;
const cleanups: (() => Promise<void> | void)[] = [];

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'jeopardy-lan-'));
  distDir = path.join(root, 'dist');
  mkdirSync(path.join(distDir, 'assets'), { recursive: true });
  writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>App</title>');
  writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.log("app");');
  // Un archivo fuera de dist/ que nunca debe servirse.
  writeFileSync(path.join(root, 'secreto.txt'), 'no');
});

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()!();
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Base de puertos distinta en cada prueba, para no chocar con otros procesos. */
function freshPorts(count = 2): number[] {
  const start = 48000 + Math.floor(Math.random() * 1500) * 10;
  return portCandidates(start, count);
}

async function start(ports = freshPorts(), onDevices: (d: ConnectedDevice[]) => void = () => {}) {
  const server = await startLanServer({ distDir, base: BASE, ports, host: '127.0.0.1', onDevices });
  cleanups.push(() => server.close());
  return server;
}

function get(port: number, urlPath: string) {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>(
    (resolve, reject) => {
      // Sin normalizar la ruta: se envía tal cual, incluidos los "..".
      const req = request({ host: '127.0.0.1', port, path: urlPath, method: 'GET' }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      });
      req.on('error', reject);
      req.end();
    },
  );
}

function occupy(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const blocker = createServer();
    blocker.once('error', reject);
    blocker.listen(port, '127.0.0.1', () => resolve(blocker));
    cleanups.push(() => new Promise<void>((done) => blocker.close(() => done())));
  });
}

function waitFor<T>(check: () => T | undefined, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const value = check();
      if (value !== undefined) return resolve(value);
      if (Date.now() - started > timeoutMs) return reject(new Error('Tiempo agotado'));
      setTimeout(poll, 20);
    };
    poll();
  });
}

function connectClient(port: number) {
  const received: unknown[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  socket.on('message', (data) => received.push(JSON.parse(String(data))));
  const opened = new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  cleanups.push(() => socket.terminate());
  return { socket, received, opened };
}

describe('rutas HTTP', () => {
  it('/ redirige a la página de conexión', async () => {
    const server = await start();
    const res = await get(server.port!, '/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${BASE}#/unirse`);
  });

  it('sirve los archivos bajo base, con no-cache para index.html', async () => {
    const server = await start();
    const index = await get(server.port!, BASE);
    expect(index.status).toBe(200);
    expect(index.body).toContain('<title>App</title>');
    expect(index.headers['cache-control']).toBe('no-cache');
    expect(index.headers['content-type']).toMatch(/^text\/html/);

    const script = await get(server.port!, `${BASE}assets/app.js`);
    expect(script.status).toBe(200);
    expect(script.body).toBe('console.log("app");');
    expect(script.headers['content-type']).toMatch(/^text\/javascript/);
  });

  it('responde 404 a una ruta con .. y a todo lo demás', async () => {
    const server = await start();
    for (const urlPath of [
      `${BASE}../secreto.txt`,
      `${BASE}%2e%2e/secreto.txt`,
      `${BASE}assets/%2e%2e%2f%2e%2e%2fsecreto.txt`,
      '/secreto.txt',
      '/api/boards',
      `${BASE}no-existe.js`,
    ]) {
      const res = await get(server.port!, urlPath);
      expect(res.status, urlPath).toBe(404);
      expect(res.body).not.toBe('no');
    }
  });
});

describe('dispositivos por WebSocket', () => {
  it('un cliente con join aparece en la lista y al cerrar desaparece', async () => {
    const changes: ConnectedDevice[][] = [];
    const server = await start(freshPorts(), (devices) => changes.push(devices));
    const client = connectClient(server.port!);
    await client.opened;

    client.socket.send(JSON.stringify({ type: 'join', deviceId: 'celu-1', label: 'Android' }));
    await waitFor(() => (changes.at(-1)?.length === 1 ? true : undefined));
    expect(server.devices()).toMatchObject([{ deviceId: 'celu-1', label: 'Android' }]);
    await waitFor(() =>
      client.received.find((msg) => (msg as { type: string }).type === 'welcome'),
    );

    client.socket.close();
    await waitFor(() => (changes.at(-1)?.length === 0 ? true : undefined));
    expect(server.devices()).toEqual([]);
  });

  it('una recarga (mismo deviceId) cuenta una sola vez', async () => {
    const server = await start();
    const first = connectClient(server.port!);
    await first.opened;
    first.socket.send(JSON.stringify({ type: 'join', deviceId: 'celu-1', label: 'Android' }));
    await waitFor(() => (server.devices().length === 1 ? true : undefined));

    const second = connectClient(server.port!);
    await second.opened;
    second.socket.send(JSON.stringify({ type: 'join', deviceId: 'celu-1', label: 'Android' }));
    await waitFor(() => (second.received.length > 0 ? true : undefined));
    expect(server.devices()).toHaveLength(1);
  });

  it('rechaza el upgrade fuera de /ws', async () => {
    const server = await start();
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/otra`);
    cleanups.push(() => socket.terminate());
    await expect(
      new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      }),
    ).rejects.toThrow();
  });

  it('ningún mensaje enviado al cliente contiene datos del juego', async () => {
    const server = await start();
    const client = connectClient(server.port!);
    await client.opened;
    client.socket.send(JSON.stringify({ type: 'join', deviceId: 'celu-1', label: 'Android' }));
    client.socket.send(JSON.stringify({ type: 'state', view: { categories: ['Historia'] } }));
    client.socket.send('no es json');
    // Da tiempo a recibir el welcome y al menos un latido.
    await new Promise((resolve) => setTimeout(resolve, 1300));
    client.socket.send(JSON.stringify({ type: 'pong' }));

    expect(client.received.length).toBeGreaterThanOrEqual(2);
    for (const msg of client.received) {
      expect(isDeviceServerMessage(msg)).toBe(true);
      const keys = Object.keys(msg as object).sort();
      expect(keys).toEqual(['serverTime', 'type']);
    }
  });
});

describe('puertos', () => {
  it('con el primer puerto ocupado usa el siguiente', async () => {
    const ports = freshPorts(3);
    await occupy(ports[0]!);
    const server = await start(ports);
    expect(server.port).toBe(ports[1]);
    expect((await get(server.port!, '/')).status).toBe(302);
  });

  it('con todos los puertos ocupados queda sin puerto', async () => {
    const ports = freshPorts(2);
    for (const port of ports) await occupy(port);
    const server = await start(ports);
    expect(server.port).toBeNull();
  });

  it('pickPort devuelve el primero que funciona o null', async () => {
    expect(await pickPort([1, 2, 3], async (port) => port >= 2)).toBe(2);
    expect(await pickPort([1, 2], async () => false)).toBeNull();
  });

  it('portCandidates arma el rango fijo de 10 desde el preferido', () => {
    expect(portCandidates()).toEqual([
      47470, 47471, 47472, 47473, 47474, 47475, 47476, 47477, 47478, 47479,
    ]);
  });
});

describe('cierre', () => {
  it('al cerrar deja de responder', async () => {
    const server: LanServer = await startLanServer({
      distDir,
      base: BASE,
      ports: freshPorts(),
      host: '127.0.0.1',
      onDevices: () => {},
    });
    const port = server.port!;
    await server.close();
    await expect(get(port, '/')).rejects.toThrow();
  });
});
