import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { boardImageIds, type Board } from '../domain/board';
import { normalizeSession, sessionBoards, type GameSession } from '../domain/game';

export const DB_NAME = 'jeopardy';
export const DB_VERSION = 1;

export interface StoredImage {
  id: string;
  blob: Blob;
  /** Tipo MIME, guardado aparte por si el Blob lo pierde al clonarse. */
  type: string;
}

interface JeopardyDB extends DBSchema {
  boards: { key: string; value: Board };
  images: { key: string; value: StoredImage };
  sessions: { key: string; value: GameSession };
}

export type JeopardyDatabase = IDBPDatabase<JeopardyDB>;

/** El navegador no pudo leer o guardar datos (base no disponible, cuota llena, transacción fallida). */
export class StorageUnavailable extends Error {
  constructor(options?: { cause?: unknown }) {
    super(
      'No se pudo acceder al almacenamiento del navegador. Es posible que esté lleno o bloqueado; los cambios no se guardaron.',
      options,
    );
    this.name = 'StorageUnavailable';
  }
}

function toStorageError(error: unknown): StorageUnavailable {
  return error instanceof StorageUnavailable ? error : new StorageUnavailable({ cause: error });
}

let dbPromise: Promise<JeopardyDatabase> | null = null;

export function openJeopardyDb(): Promise<JeopardyDatabase> {
  if (!dbPromise) {
    const opening = (async () => {
      try {
        return await openDB<JeopardyDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            db.createObjectStore('boards', { keyPath: 'id' });
            db.createObjectStore('images');
            db.createObjectStore('sessions', { keyPath: 'id' });
          },
          blocking() {
            // Otra pestaña necesita una versión nueva: soltar la conexión.
            void closeJeopardyDb();
          },
          terminated() {
            dbPromise = null;
          },
        });
      } catch (error) {
        throw toStorageError(error);
      }
    })();
    dbPromise = opening;
    // Si falla la apertura, el siguiente intento vuelve a probar.
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null;
    });
  }
  return dbPromise;
}

/** Cierra y olvida la conexión actual; la próxima operación abre una nueva. */
async function closeJeopardyDb(): Promise<void> {
  const current = dbPromise;
  dbPromise = null;
  if (!current) return;
  try {
    (await current).close();
  } catch {
    // La apertura ya había fallado: no hay nada que cerrar.
  }
}

/** Para tests: suelta la conexión, p. ej. antes de cambiar `indexedDB` por una fábrica nueva. */
export function resetDbForTests(): Promise<void> {
  return closeJeopardyDb();
}

async function withDb<T>(operation: (db: JeopardyDatabase) => Promise<T>): Promise<T> {
  try {
    return await operation(await openJeopardyDb());
  } catch (error) {
    throw toStorageError(error);
  }
}

export function listBoards(): Promise<Board[]> {
  return withDb(async (db) => {
    const boards = await db.getAll('boards');
    return boards.sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export function getBoard(id: string): Promise<Board | null> {
  return withDb(async (db) => (await db.get('boards', id)) ?? null);
}

export function saveBoard(board: Board): Promise<void> {
  return withDb(async (db) => {
    await db.put('boards', board);
  });
}

/**
 * Borra el tablero y sus imágenes, salvo las que siga usando otro tablero o alguna ronda de una
 * sesión guardada.
 */
export function deleteBoard(id: string): Promise<void> {
  return withDb(async (db) => {
    const tx = db.transaction(['boards', 'images', 'sessions'], 'readwrite');
    const board = await tx.objectStore('boards').get(id);
    if (board) {
      const orphanIds = boardImageIds(board);
      const others = (await tx.objectStore('boards').getAll()).filter((other) => other.id !== id);
      const sessions = await tx.objectStore('sessions').getAll();
      const sessionSnapshots = sessions.flatMap((session) =>
        sessionBoards(normalizeSession(session)),
      );
      for (const other of [...others, ...sessionSnapshots]) {
        for (const imageId of boardImageIds(other)) orphanIds.delete(imageId);
      }
      const images = tx.objectStore('images');
      await Promise.all([...orphanIds].map((imageId) => images.delete(imageId)));
      await tx.objectStore('boards').delete(id);
    }
    await tx.done;
  });
}

export function putImage(id: string, blob: Blob): Promise<void> {
  return withDb(async (db) => {
    await db.put('images', { id, blob, type: blob.type }, id);
  });
}

export function getImage(id: string): Promise<StoredImage | null> {
  return withDb(async (db) => (await db.get('images', id)) ?? null);
}

export function deleteImage(id: string): Promise<void> {
  return withDb((db) => db.delete('images', id));
}

export function saveSession(session: GameSession): Promise<void> {
  return withDb(async (db) => {
    await db.put('sessions', session);
  });
}

/** Devuelve la sesión normalizada: las guardadas antes de las rondas quedan con una ronda x1. */
export function getSession(id: string): Promise<GameSession | null> {
  return withDb(async (db) => {
    const stored = await db.get('sessions', id);
    return stored ? normalizeSession(stored) : null;
  });
}
