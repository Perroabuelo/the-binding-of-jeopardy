/** Mensajes entre los celulares y la app de escritorio por la red local (WebSocket en `/ws`). */

import type { DeviceCommonView, DeviceTeamView } from '../domain/deviceProjection';
import { FINAL_ANSWER_MAX_LENGTH } from '../domain/game';

export const DEVICE_ID_MAX_LENGTH = 64;
export const DEVICE_LABEL_MAX_LENGTH = 40;
export const TEAM_ID_MAX_LENGTH = 64;

/** Celular -> app. */
export type DeviceClientMessage =
  /**
   * Se presenta al conectarse (y al reconectarse) con su id guardado y, si lo tiene, el equipo
   * que eligió antes.
   */
  | { type: 'join'; deviceId: string; label: string; teamId?: string }
  /** Respuesta al latido. */
  | { type: 'pong' }
  | { type: 'chooseTeam'; teamId: string }
  | { type: 'buzz' }
  | { type: 'finalWager'; amount: number }
  | { type: 'finalAnswer'; text: string };

/**
 * Lo que recibe un celular: lo común, más los datos de su equipo y su estado propio. Nunca
 * preguntas, respuestas, puntajes ni datos de otros equipos.
 */
export type PhoneView = DeviceCommonView & {
  teamId?: string;
  team?: DeviceTeamView;
  /** Milisegundos desde epoch en el reloj del servidor. */
  lockedUntil?: number;
  /** Su toque ganó. */
  youWon?: boolean;
};

/** App -> celular. */
export type DeviceServerMessage =
  /** Confirma el `join`. `serverTime` es la base para corregir el desfase de reloj. */
  | { type: 'welcome'; serverTime: number }
  /** Latido, con la hora del servidor para seguir corrigiendo el desfase. */
  | { type: 'ping'; serverTime: number }
  /** Estado del juego para este celular; null sin un juego con pulsadores en curso. */
  | { type: 'game'; view: PhoneView | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isDeviceClientMessage(value: unknown): value is DeviceClientMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'join':
      return (
        isBoundedString(value.deviceId, DEVICE_ID_MAX_LENGTH) &&
        isBoundedString(value.label, DEVICE_LABEL_MAX_LENGTH) &&
        (value.teamId === undefined || isBoundedString(value.teamId, TEAM_ID_MAX_LENGTH))
      );
    case 'chooseTeam':
      return isBoundedString(value.teamId, TEAM_ID_MAX_LENGTH);
    case 'finalWager':
      return Number.isSafeInteger(value.amount) && (value.amount as number) >= 0;
    case 'finalAnswer':
      return isBoundedString(value.text, FINAL_ANSWER_MAX_LENGTH);
    case 'pong':
    case 'buzz':
      return true;
    default:
      return false;
  }
}

export function isDeviceServerMessage(value: unknown): value is DeviceServerMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'welcome':
    case 'ping':
      return isTime(value.serverTime);
    case 'game':
      return value.view === null || isRecord(value.view);
    default:
      return false;
  }
}

/** Interpreta un mensaje de texto recibido; `null` si no es JSON o no es un mensaje válido. */
export function parseMessage<M>(text: string, isMessage: (value: unknown) => value is M): M | null {
  try {
    const value: unknown = JSON.parse(text);
    return isMessage(value) ? value : null;
  } catch {
    return null;
  }
}
