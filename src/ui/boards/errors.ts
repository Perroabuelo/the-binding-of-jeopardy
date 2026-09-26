import { StorageUnavailable } from '../../storage/db';

/** Mensaje para el aviso de error; los errores de almacenamiento ya traen uno claro. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof StorageUnavailable) return error.message;
  const detail = error instanceof Error ? error.message : String(error);
  return detail ? `${fallback} ${detail}` : fallback;
}
