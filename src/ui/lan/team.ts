export const TEAM_ID_KEY = 'jeopardy:teamId';

/**
 * Equipo que eligió el celular, guardado en `localStorage` para volver a él tras una recarga o un
 * reinicio de la app. Sin almacenamiento, se pierde al recargar y el invitado vuelve a elegir.
 */
export function readTeamId(storage: () => Storage = () => window.localStorage): string | null {
  try {
    return storage().getItem(TEAM_ID_KEY);
  } catch {
    return null;
  }
}

export function saveTeamId(
  teamId: string,
  storage: () => Storage = () => window.localStorage,
): void {
  try {
    storage().setItem(TEAM_ID_KEY, teamId);
  } catch {
    // Sin almacenamiento: queda solo para esta conexión.
  }
}

export function clearTeamId(storage: () => Storage = () => window.localStorage): void {
  try {
    storage().removeItem(TEAM_ID_KEY);
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}
