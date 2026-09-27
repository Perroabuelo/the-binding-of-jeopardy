/**
 * Corrección del desfase entre el reloj del celular y el de la app de escritorio. Solo se usa para
 * las cuentas regresivas: el orden de los toques no depende de relojes.
 */

/** Cuántas muestras promedia el desfase. */
export const OFFSET_SAMPLES = 5;

/** Desfase `serverTime - localNow` de una muestra. */
export function offsetSample(serverTime: number, localNow: number): number {
  return serverTime - localNow;
}

/** Agrega una muestra y devuelve las últimas `OFFSET_SAMPLES`. */
export function addOffsetSample(samples: readonly number[], sample: number): number[] {
  return [...samples, sample].slice(-OFFSET_SAMPLES);
}

/** Media simple de las muestras; 0 sin muestras. */
export function averageOffset(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
}

/**
 * Milisegundos que faltan para `endsAt` (en el reloj del servidor) vistos desde el celular, nunca
 * menos de 0.
 */
export function remainingWithOffset(endsAt: number, localNow: number, offset: number): number {
  return Math.max(0, endsAt - (localNow + offset));
}
