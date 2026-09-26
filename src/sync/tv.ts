import type { TvView } from '../domain/game';
import { OPERATOR_TIMEOUT_MS } from './protocol';
import type { SyncTransport } from './transport';

export interface TvSyncOptions {
  onView: (view: TvView) => void;
  /** Se llama al pasar a la pantalla de espera (bye o timeout del operador). */
  onWaiting: () => void;
}

export interface TvSync {
  dispose(): void;
}

export function createTvSync(
  transport: SyncTransport,
  { onView, onWaiting }: TvSyncOptions,
): TvSync {
  let waiting = false;
  let hasView = false;
  let disposed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const clearWatchdog = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = undefined;
  };

  const enterWaiting = () => {
    clearWatchdog();
    if (waiting) return;
    waiting = true;
    hasView = false;
    onWaiting();
  };

  const resetWatchdog = () => {
    clearWatchdog();
    timeout = setTimeout(enterWaiting, OPERATOR_TIMEOUT_MS);
  };

  const unsubscribe = transport.subscribe((msg) => {
    if (disposed) return;
    switch (msg.type) {
      case 'state':
        waiting = false;
        hasView = true;
        resetWatchdog();
        onView(msg.view);
        break;
      case 'ping':
        // El operador está vivo pero no tenemos su estado: lo pedimos.
        if (waiting || !hasView) transport.send({ type: 'hello' });
        if (!waiting) resetWatchdog();
        break;
      case 'bye':
        enterWaiting();
        break;
      case 'hello':
        // Hello de otra TV: no indica actividad del operador.
        break;
    }
  });

  resetWatchdog();
  transport.send({ type: 'hello' });

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      clearWatchdog();
      unsubscribe();
    },
  };
}
