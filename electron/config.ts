import path from 'node:path';
import { app } from 'electron';
import { PREFERRED_LAN_PORT } from './lanServer';

/**
 * Rutas y puerto de la app. Las pruebas los reemplazan con variables de entorno, que solo
 * se leen si están definidas.
 */

/** Debe llamarse antes de `app.ready` para que IndexedDB y localStorage usen esta carpeta. */
export function applyUserDataOverride(): void {
  const userData = process.env.JEOPARDY_USER_DATA;
  if (userData) app.setPath('userData', path.resolve(userData));
}

export function backupDir(): string {
  const override = process.env.JEOPARDY_BACKUP_DIR;
  if (override) return path.resolve(override);
  return path.join(app.getPath('documents'), 'The Binding of Jeopardy', 'Respaldos');
}

export function preferredLanPort(): number {
  const override = Number(process.env.JEOPARDY_LAN_PORT);
  return Number.isInteger(override) && override > 0 && override < 65536
    ? override
    : PREFERRED_LAN_PORT;
}
