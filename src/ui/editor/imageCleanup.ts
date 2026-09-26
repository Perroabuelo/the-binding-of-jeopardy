import type { Board } from '../../domain/board';
import { openJeopardyDb, StorageUnavailable } from '../../storage/db';

function usesImage(board: Board, imageId: string): boolean {
  return board.categories.some((category) =>
    category.clues.some((clue) => clue.imageId === imageId),
  );
}

/**
 * Borra la imagen solo si ningún tablero ni sesión guardada (su `boardSnapshot`) la usa,
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
      boards.some((board) => usesImage(board, imageId)) ||
      sessions.some((session) => usesImage(session.boardSnapshot, imageId));
    if (!inUse) await tx.objectStore('images').delete(imageId);
    await tx.done;
    return !inUse;
  } catch (error) {
    throw error instanceof StorageUnavailable ? error : new StorageUnavailable({ cause: error });
  }
}
