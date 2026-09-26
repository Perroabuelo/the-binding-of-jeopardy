import { useEffect, useState } from 'react';
import { FINAL_TIMER_MS } from '../../domain/game';

export const TICK_MS = 250;

/**
 * Milisegundos que faltan para `endsAt` (entre 0 y `FINAL_TIMER_MS`), actualizados cada `TICK_MS`
 * hasta llegar a 0. `null` si no hay temporizador.
 */
export function useCountdown(endsAt: number | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === undefined) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [endsAt]);

  if (endsAt === undefined) return null;
  return Math.min(FINAL_TIMER_MS, Math.max(0, endsAt - now));
}

/** Segundos enteros restantes para mostrar: 30, 29, … 1, 0. */
export function secondsLeft(remainingMs: number): number {
  return Math.ceil(remainingMs / 1000);
}
