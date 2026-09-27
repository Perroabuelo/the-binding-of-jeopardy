import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isBackupOf } from '../src/domain/backup';
import { EXCHANGE_FILE_SUFFIX } from '../src/domain/exchange';
import type { BackupFile } from '../src/platform/desktop';

export const TRASH_DIR_NAME = 'eliminados';

export interface BackupStore {
  readonly dir: string;
  writeBoard(file: BackupFile): Promise<void>;
  trashBoard(boardId: string): Promise<void>;
}

/** Nombre simple, sin rutas: lo arma la UI con `backupFileName` y debe ser de ese tablero. */
function assertValidFile(file: BackupFile): void {
  const { boardId, fileName, json } = file;
  if (typeof boardId !== 'string' || boardId === '') throw new Error('Tablero inválido');
  if (typeof json !== 'string') throw new Error('Contenido inválido');
  if (
    typeof fileName !== 'string' ||
    path.basename(fileName) !== fileName ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.startsWith('.') ||
    !fileName.endsWith(EXCHANGE_FILE_SUFFIX) ||
    !isBackupOf(fileName, boardId)
  ) {
    throw new Error('Nombre de respaldo inválido');
  }
}

/**
 * Respaldos de tableros en disco, un archivo por tablero. Las escrituras de un mismo tablero
 * van en serie para que la última gane.
 */
export function createBackupStore(dir: string): BackupStore {
  const trashDir = path.join(dir, TRASH_DIR_NAME);
  const queues = new Map<string, Promise<void>>();

  function enqueue(boardId: string, task: () => Promise<void>): Promise<void> {
    const previous = queues.get(boardId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    queues.set(boardId, next);
    void next
      .finally(() => {
        if (queues.get(boardId) === next) queues.delete(boardId);
      })
      .catch(() => {});
    return next;
  }

  async function filesOf(folder: string, boardId: string): Promise<string[]> {
    try {
      return (await readdir(folder)).filter((name) => isBackupOf(name, boardId));
    } catch {
      return [];
    }
  }

  return {
    dir,

    writeBoard(file) {
      try {
        assertValidFile(file);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return enqueue(file.boardId, async () => {
        await mkdir(dir, { recursive: true });
        // Primero a un temporal y después rename: un respaldo nunca queda a medio escribir.
        const tmp = path.join(dir, `.${file.fileName}.${randomBytes(4).toString('hex')}.tmp`);
        try {
          await writeFile(tmp, file.json, 'utf8');
          await rename(tmp, path.join(dir, file.fileName));
        } catch (error) {
          await unlink(tmp).catch(() => {});
          throw error;
        }
        // Los archivos con títulos anteriores del mismo tablero ya no hacen falta.
        for (const name of await filesOf(dir, file.boardId)) {
          if (name !== file.fileName) await unlink(path.join(dir, name)).catch(() => {});
        }
      });
    },

    trashBoard(boardId) {
      if (typeof boardId !== 'string' || boardId === '') {
        return Promise.reject(new Error('Tablero inválido'));
      }
      return enqueue(boardId, async () => {
        const files = await filesOf(dir, boardId);
        if (files.length === 0) return;
        await mkdir(trashDir, { recursive: true });
        // rename reemplaza un archivo anterior con el mismo nombre en eliminados/.
        for (const name of files) await rename(path.join(dir, name), path.join(trashDir, name));
      });
    },
  };
}
