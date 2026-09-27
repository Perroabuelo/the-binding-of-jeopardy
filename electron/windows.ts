/** Monitor tal como lo describe `screen.getAllDisplays()`, reducido a lo que se usa. */
export interface DisplayInfo {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export const TV_WINDOW_SIZE = { width: 1280, height: 720 };

/**
 * Elige el monitor de la TV: el primero distinto del que contiene al operador.
 * Con un solo monitor devuelve `null` y la TV se abre como una ventana normal.
 */
export function pickTvDisplay<D extends DisplayInfo>(
  displays: readonly D[],
  operatorDisplayId: number,
): D | null {
  return displays.find((display) => display.id !== operatorDisplayId) ?? null;
}
