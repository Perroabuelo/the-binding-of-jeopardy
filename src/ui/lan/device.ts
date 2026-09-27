export const DEVICE_ID_KEY = 'jeopardy:deviceId';

/**
 * Id aleatorio del celular. En `http://IP` no hay contexto seguro ni `crypto.randomUUID`,
 * pero `getRandomValues` sí está disponible.
 */
export function randomDeviceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Id del celular guardado en `localStorage`, para que una recarga cuente como el mismo
 * dispositivo. Si no se puede guardar, se usa uno en memoria (una recarga contaría como otro).
 */
export function getDeviceId(storage: () => Storage = () => window.localStorage): string {
  try {
    const saved = storage().getItem(DEVICE_ID_KEY);
    if (saved && /^[0-9a-f]{8,64}$/.test(saved)) return saved;
  } catch {
    return randomDeviceId();
  }
  const id = randomDeviceId();
  try {
    storage().setItem(DEVICE_ID_KEY, id);
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
  return id;
}

/** Nombre del dispositivo para la lista del operador, según el user agent. */
export function deviceLabel(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  return 'Celular';
}

/** Dirección del WebSocket de la red local a partir de la página actual. */
export function lanSocketUrl(pageUrl: string): string {
  const url = new URL('/ws', pageUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
