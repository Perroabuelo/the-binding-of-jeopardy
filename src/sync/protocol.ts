import type { TvView } from '../domain/game';

export const PING_INTERVAL_MS = 2000;
export const OPERATOR_TIMEOUT_MS = 10000;

export type SyncMessage =
  /** TV -> operador: pide el estado actual (al cargar o recargar). */
  | { type: 'hello' }
  /** Operador -> TV: estado completo a dibujar. */
  | { type: 'state'; view: TvView }
  /** Operador -> TV: latido. */
  | { type: 'ping' }
  /** Operador -> TV: el operador se cierra. */
  | { type: 'bye' };

const MESSAGE_TYPES: ReadonlySet<string> = new Set(['hello', 'state', 'ping', 'bye']);

/** Filtra mensajes ajenos o mal formados que lleguen por el canal. */
export function isSyncMessage(value: unknown): value is SyncMessage {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  if (typeof type !== 'string' || !MESSAGE_TYPES.has(type)) return false;
  if (type === 'state') {
    const view = (value as { view?: unknown }).view;
    return typeof view === 'object' && view !== null;
  }
  return true;
}

export function channelName(sessionId: string): string {
  return `jeopardy:${sessionId}`;
}
