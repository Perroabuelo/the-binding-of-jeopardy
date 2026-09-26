import type { TvView } from '../domain/game';
import { PING_INTERVAL_MS } from './protocol';
import type { SyncTransport } from './transport';

export interface OperatorSyncOptions {
  /** Vista actual, usada para responder al hello de la TV. */
  getView: () => TvView;
}

export interface OperatorSync {
  publish(view: TvView): void;
  /** Envía bye y detiene el latido. No cierra el transporte. */
  dispose(): void;
}

export function createOperatorSync(
  transport: SyncTransport,
  { getView }: OperatorSyncOptions,
): OperatorSync {
  let disposed = false;

  const unsubscribe = transport.subscribe((msg) => {
    if (msg.type === 'hello') transport.send({ type: 'state', view: getView() });
  });

  const pingTimer = setInterval(() => {
    transport.send({ type: 'ping' });
  }, PING_INTERVAL_MS);

  return {
    publish(view) {
      if (disposed) return;
      transport.send({ type: 'state', view });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(pingTimer);
      unsubscribe();
      transport.send({ type: 'bye' });
    },
  };
}
