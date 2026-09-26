import { boardImageIds } from '../../domain/board';
import { normalizeSession, sessionBoards } from '../../domain/game';
import { openJeopardyDb, StorageUnavailable } from '../../storage/db';

/**
 * Borra la imagen solo si ningún tablero ni ronda de una sesión guardada la usa,
 * como hace `deleteBoard`. Devuelve si la borró.
 */
export async function deleteImageIfUnused(imageId: string): Promise<boolean> {
  try {
    const db = await openJeopardyDb();
    const tx = db.transaction(['boards', 'images', 'sessions'], 'readwrite');
    const [boards, sessions] = await Promise.all([
      tx.objectStore('boards').getAll(),
      tx.objectStore('sessions').getAll(),
    ]);
    const inUse =
      boards.some((board) => boardImageIds(board).has(imageId)) ||
      sessions.some((session) =>
        sessionBoards(normalizeSession(session)).some((board) => boardImageIds(board).has(imageId)),
      );
    if (!inUse) await tx.objectStore('images').delete(imageId);
    await tx.done;
    return !inUse;
  } catch (error) {
    throw error instanceof StorageUnavailable ? error : new StorageUnavailable({ cause: error });
  }
}
