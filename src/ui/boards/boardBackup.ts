import { backupFileName } from '../../domain/backup';
import type { Board } from '../../domain/board';
import { getDesktopApi, type DesktopApi } from '../../platform/desktop';
import { buildBoardExport } from './boardFiles';

/** El editor guarda en cada cambio: el respaldo en disco espera 3 s sin cambios. */
export const BACKUP_DEBOUNCE_MS = 3000;
export const BACKUP_FAILED_MESSAGE =
  'No se pudo respaldar el tablero en disco. Sigue guardado en la app.';
export const TRASH_FAILED_MESSAGE =
  'No se pudo mover el respaldo del tablero eliminado a la carpeta "eliminados".';

export type BackupFailureListener = (message: string) => void;

export interface BoardBackup {
  /** Respalda el tablero cuando pasen 3 s sin otro guardado del mismo tablero. */
  schedule(board: Board): void;
  /** Escribe ya lo pendiente (de un tablero o de todos) y espera a que termine. */
  flush(boardId?: string): Promise<void>;
  /** Respalda de inmediato (al crear o importar). */
  backupNow(board: Board): Promise<void>;
  /** Mueve el respaldo a "eliminados" (al eliminar el tablero). */
  trash(boardId: string): Promise<void>;
  /** Avisos de falla, para mostrarlos sin bloquear la edición. */
  onFailure(listener: BackupFailureListener): () => void;
}

export interface BoardBackupOptions {
  desktop?: () => DesktopApi | null;
  build?: (board: Board) => Promise<string>;
  debounceMs?: number;
}

/**
 * Respaldo de tableros en disco, solo en la app de escritorio. Nunca bloquea ni hace fallar
 * el guardado en la app: si el respaldo falla, solo avisa.
 */
export function createBoardBackup(options: BoardBackupOptions = {}): BoardBackup {
  const desktop = options.desktop ?? getDesktopApi;
  const build = options.build ?? buildBoardExport;
  const debounceMs = options.debounceMs ?? BACKUP_DEBOUNCE_MS;
  const pending = new Map<string, { board: Board; timer: ReturnType<typeof setTimeout> }>();
  // Las escrituras de un mismo tablero van en serie: la última gana.
  const queues = new Map<string, Promise<void>>();
  const listeners = new Set<BackupFailureListener>();

  function notify(message: string) {
    for (const listener of [...listeners]) listener(message);
  }

  function enqueue(boardId: string, task: () => Promise<void>): Promise<void> {
    const next = (queues.get(boardId) ?? Promise.resolve()).then(task);
    queues.set(boardId, next);
    void next.then(() => {
      if (queues.get(boardId) === next) queues.delete(boardId);
    });
    return next;
  }

  function write(board: Board): Promise<void> {
    const api = desktop();
    if (!api) return Promise.resolve();
    return enqueue(board.id, async () => {
      try {
        const json = await build(board);
        await api.backup.writeBoard({ boardId: board.id, fileName: backupFileName(board), json });
      } catch {
        notify(BACKUP_FAILED_MESSAGE);
      }
    });
  }

  function takePending(boardId: string): Board | null {
    const entry = pending.get(boardId);
    if (!entry) return null;
    clearTimeout(entry.timer);
    pending.delete(boardId);
    return entry.board;
  }

  return {
    schedule(board) {
      if (!desktop()) return;
      takePending(board.id);
      const timer = setTimeout(() => {
        const next = takePending(board.id);
        if (next) void write(next);
      }, debounceMs);
      pending.set(board.id, { board, timer });
    },

    async flush(boardId) {
      const ids = boardId === undefined ? [...pending.keys()] : [boardId];
      await Promise.all(
        ids.map((id) => {
          const board = takePending(id);
          return board ? write(board) : (queues.get(id) ?? Promise.resolve());
        }),
      );
    },

    backupNow(board) {
      takePending(board.id);
      return write(board);
    },

    trash(boardId) {
      const api = desktop();
      takePending(boardId);
      if (!api) return Promise.resolve();
      return enqueue(boardId, async () => {
        try {
          await api.backup.trashBoard(boardId);
        } catch {
          notify(TRASH_FAILED_MESSAGE);
        }
      });
    },

    onFailure(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Respaldo compartido por las pantallas: el editor, la lista de tableros y el aviso. */
export const boardBackup = createBoardBackup();
