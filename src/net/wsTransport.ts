import type { SyncHandler, SyncTransport } from '../sync/transport';
import { parseMessage } from './protocol';

export type WsTransportStatus = 'connecting' | 'open' | 'reconnecting';

/** Esperas entre reintentos: crecen hasta un máximo de 5 s. */
export const RECONNECT_DELAYS_MS = [500, 1000, 2000, 5000] as const;

/** Lo mínimo de `WebSocket` que se usa, para poder probarlo con uno falso. */
export interface WebSocketLike {
  readonly readyState: number;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

export type WebSocketConstructor = new (url: string) => WebSocketLike;

const OPEN = 1;

export interface WsTransportOptions<M> {
  isMessage(value: unknown): value is M;
  WebSocketImpl?: WebSocketConstructor;
  onStatus?(status: WsTransportStatus): void;
  /**
   * Sin ningún mensaje durante este tiempo, se da la conexión por perdida y se reconecta
   * (el servidor manda un latido por segundo). Sin valor, no se vigila.
   */
  idleTimeoutMs?: number;
}

/**
 * Transporte por WebSocket del lado del celular. Reconecta solo con espera creciente e informa
 * el estado. Los mensajes inválidos se descartan; lo enviado sin conexión se pierde.
 */
export function createWebSocketTransport<M, Out = M>(
  url: string,
  options: WsTransportOptions<M>,
): SyncTransport<M, Out> {
  const WebSocketImpl =
    options.WebSocketImpl ?? (globalThis.WebSocket as unknown as WebSocketConstructor);
  const handlers = new Set<SyncHandler<M>>();
  let socket: WebSocketLike | null = null;
  let attempt = 0;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function setStatus(status: WsTransportStatus) {
    options.onStatus?.(status);
  }

  function clearIdle() {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = null;
  }

  function watchIdle(current: WebSocketLike) {
    clearIdle();
    if (options.idleTimeoutMs === undefined) return;
    idleTimer = setTimeout(() => {
      if (socket === current) lost(current);
    }, options.idleTimeoutMs);
  }

  /** La conexión se cerró o se dio por perdida: se programa el siguiente intento. */
  function lost(current: WebSocketLike) {
    if (socket !== current) return;
    socket = null;
    clearIdle();
    current.onopen = current.onclose = current.onerror = current.onmessage = null;
    try {
      current.close();
    } catch {
      // Ya estaba cerrado.
    }
    if (closed) return;
    setStatus('reconnecting');
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]!;
    attempt++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      open();
    }, delay);
  }

  function open() {
    if (closed) return;
    let current: WebSocketLike;
    try {
      current = new WebSocketImpl(url);
    } catch {
      // URL inválida o sin soporte: se reintenta igual que un cierre.
      const placeholder = { close() {} } as WebSocketLike;
      socket = placeholder;
      lost(placeholder);
      return;
    }
    socket = current;
    current.onopen = () => {
      attempt = 0;
      watchIdle(current);
      setStatus('open');
    };
    current.onmessage = (event) => {
      watchIdle(current);
      if (typeof event.data !== 'string') return;
      const msg = parseMessage(event.data, options.isMessage);
      if (!msg) return;
      for (const handler of [...handlers]) handler(msg);
    };
    current.onerror = () => lost(current);
    current.onclose = () => lost(current);
  }

  setStatus('connecting');
  open();

  return {
    send(msg) {
      if (closed || !socket || socket.readyState !== OPEN) return;
      socket.send(JSON.stringify(msg));
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    close() {
      if (closed) return;
      closed = true;
      handlers.clear();
      if (retryTimer !== null) clearTimeout(retryTimer);
      retryTimer = null;
      clearIdle();
      const current = socket;
      socket = null;
      if (current) {
        current.onopen = current.onclose = current.onerror = current.onmessage = null;
        current.close();
      }
    },
  };
}
