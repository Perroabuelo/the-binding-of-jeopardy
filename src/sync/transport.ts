import { channelName, isSyncMessage, type SyncMessage } from './protocol';

export type SyncHandler<M = SyncMessage> = (msg: M) => void;

/**
 * Canal de mensajes. Por defecto, el de operador y TV (mismos mensajes en ambos sentidos); la
 * red local lo usa con sus propios mensajes, distintos para recibir (`M`) y enviar (`Out`).
 */
export interface SyncTransport<M = SyncMessage, Out = M> {
  send(msg: Out): void;
  /** Devuelve la función para desuscribirse. */
  subscribe(handler: SyncHandler<M>): () => void;
  close(): void;
}

export function createBroadcastTransport(sessionId: string): SyncTransport {
  const channel = new BroadcastChannel(channelName(sessionId));
  const handlers = new Set<SyncHandler>();
  let closed = false;

  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!isSyncMessage(event.data)) return;
    const msg = event.data;
    for (const handler of [...handlers]) handler(msg);
  };

  return {
    send(msg) {
      if (closed) return;
      channel.postMessage(msg);
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
      channel.onmessage = null;
      channel.close();
    },
  };
}

export interface MemoryBus {
  /** Crea un extremo conectado al bus, equivalente a abrir un BroadcastChannel. */
  connect(): SyncTransport;
}

interface MemoryEndpoint {
  handlers: Set<SyncHandler>;
}

/**
 * Bus en memoria para tests. Imita a BroadcastChannel: la entrega es asíncrona
 * (microtarea), el mensaje se clona y el emisor no recibe su propio mensaje.
 */
export function createMemoryBus(): MemoryBus {
  const endpoints = new Set<MemoryEndpoint>();

  return {
    connect() {
      const self: MemoryEndpoint = { handlers: new Set() };
      let closed = false;
      endpoints.add(self);

      return {
        send(msg) {
          if (closed) return;
          for (const endpoint of endpoints) {
            if (endpoint === self) continue;
            const copy = structuredClone(msg);
            queueMicrotask(() => {
              if (!endpoints.has(endpoint)) return;
              for (const handler of [...endpoint.handlers]) handler(copy);
            });
          }
        },
        subscribe(handler) {
          self.handlers.add(handler);
          return () => {
            self.handlers.delete(handler);
          };
        },
        close() {
          closed = true;
          self.handlers.clear();
          endpoints.delete(self);
        },
      };
    },
  };
}

export function createMemoryTransportPair(): [SyncTransport, SyncTransport] {
  const bus = createMemoryBus();
  return [bus.connect(), bus.connect()];
}
