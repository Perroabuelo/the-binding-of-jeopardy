/** Mensajes entre los celulares y la app de escritorio por la red local (WebSocket en `/ws`). */

export const DEVICE_ID_MAX_LENGTH = 64;
export const DEVICE_LABEL_MAX_LENGTH = 40;

/** Celular -> app. */
export type DeviceClientMessage =
  /** Se presenta al conectarse (y al reconectarse) con su id guardado. */
  | { type: 'join'; deviceId: string; label: string }
  /** Respuesta al latido. */
  | { type: 'pong' };

/** App -> celular. Nunca lleva datos del juego. */
export type DeviceServerMessage =
  /** Confirma el `join`. `serverTime` es la base para corregir el desfase de reloj. */
  | { type: 'welcome'; serverTime: number }
  /** Latido. */
  | { type: 'ping' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

export function isDeviceClientMessage(value: unknown): value is DeviceClientMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'join':
      return (
        isBoundedString(value.deviceId, DEVICE_ID_MAX_LENGTH) &&
        isBoundedString(value.label, DEVICE_LABEL_MAX_LENGTH)
      );
    case 'pong':
      return true;
    default:
      return false;
  }
}

export function isDeviceServerMessage(value: unknown): value is DeviceServerMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'welcome':
      return typeof value.serverTime === 'number' && Number.isFinite(value.serverTime);
    case 'ping':
      return true;
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
