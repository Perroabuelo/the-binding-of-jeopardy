import type { Board } from './board';
import { EXCHANGE_FILE_SUFFIX, exportFileName } from './exchange';

const ID_TAG_LENGTH = 8;

/** Parte del id que identifica al tablero en el nombre del archivo: "(a1b2c3d4)". */
function idTag(boardId: string): string {
  const safe = boardId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, ID_TAG_LENGTH);
  return `(${safe || 'tablero'})`;
}

/**
 * Nombre del respaldo en disco: el de exportación con el id, para que cada tablero tenga un
 * único archivo aunque cambie el título. Ej.: "Mi tablero (a1b2c3d4).jeopardy.json".
 */
export function backupFileName(board: Pick<Board, 'id' | 'title'>): string {
  const exportName = exportFileName(board);
  const base = exportName.slice(0, -EXCHANGE_FILE_SUFFIX.length);
  return `${base} ${idTag(board.id)}${EXCHANGE_FILE_SUFFIX}`;
}

/** Reconoce los archivos de respaldo de un tablero (con cualquier título) por el sufijo del id. */
export function isBackupOf(fileName: string, boardId: string): boolean {
  return fileName.endsWith(` ${idTag(boardId)}${EXCHANGE_FILE_SUFFIX}`);
}
