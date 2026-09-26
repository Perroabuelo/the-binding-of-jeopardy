import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board } from '../../domain/board';
import { getBoard, saveBoard } from '../../storage/db';

export const SAVE_DEBOUNCE_MS = 300;

export type EditorLoad =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; board: Board };

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface BoardEditor {
  load: EditorLoad;
  saveStatus: SaveStatus;
  saveError: string | null;
  /** Aplica un cambio y lo guarda con debounce. */
  update: (mutate: (board: Board) => Board) => void;
  /**
   * Guarda de inmediato lo pendiente y espera los guardados en curso.
   * Devuelve `false` si el tablero guardado no quedó al día.
   */
  flush: () => Promise<boolean>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useBoardEditor(boardId: string): BoardEditor {
  const [load, setLoad] = useState<EditorLoad>({ status: 'loading' });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const boardRef = useRef<Board | null>(null);
  const pendingRef = useRef<Board | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(0);
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    let cancelled = false;
    getBoard(boardId)
      .then((board) => {
        if (cancelled) return;
        boardRef.current = board;
        setLoad(board ? { status: 'ready', board } : { status: 'notFound' });
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const save = useCallback(async (board: Board): Promise<boolean> => {
    try {
      await saveBoard(board);
      inFlightRef.current--;
      setSaveError(null);
      if (inFlightRef.current === 0 && !pendingRef.current) setSaveStatus('saved');
      return true;
    } catch (e) {
      inFlightRef.current--;
      // Se reintenta con el próximo cambio o al salir del editor.
      pendingRef.current ??= board;
      setSaveError(errorMessage(e));
      setSaveStatus('error');
      return false;
    }
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const board = pendingRef.current;
    if (board) {
      pendingRef.current = null;
      inFlightRef.current++;
      // Guardados en serie: el resultado corresponde al último cambio.
      queueRef.current = queueRef.current.then(() => save(board));
    }
    return queueRef.current;
  }, [save]);

  const update = useCallback<BoardEditor['update']>(
    (mutate) => {
      const current = boardRef.current;
      if (!current) return;
      const next = { ...mutate(current), updatedAt: Date.now() };
      boardRef.current = next;
      pendingRef.current = next;
      setLoad({ status: 'ready', board: next });
      setSaveStatus('saving');
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Lo pendiente se guarda al cerrar la pestaña y al salir del editor.
  useEffect(() => {
    const onPageHide = () => void flush();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return { load, saveStatus, saveError, update, flush };
}
