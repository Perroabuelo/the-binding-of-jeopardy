import { useEffect, useState } from 'react';
import { createEmptyBoard, type Board } from '../../domain/board';
import { deleteBoard, listBoards, saveBoard } from '../../storage/db';
import { BoardListItem } from '../boards/BoardListItem';
import { ConfirmDialog } from '../boards/ConfirmDialog';
import { errorMessage } from '../boards/errors';
import { boardDisplayTitle } from '../boards/format';
import { newId } from '../lib/ids';
import { navigate } from '../router';
import styles from './BoardListScreen.module.css';

export function BoardListScreen() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Board | null>(null);

  async function refresh() {
    setBoards(await listBoards());
  }

  useEffect(() => {
    listBoards()
      .then(setBoards)
      .catch((e: unknown) => setError(errorMessage(e, 'No se pudieron cargar los tableros.')));
  }, []);

  async function createBoard() {
    const board = createEmptyBoard(newId(), Date.now());
    try {
      await saveBoard(board);
      navigate({ name: 'editor', boardId: board.id });
    } catch (e) {
      setError(errorMessage(e, 'No se pudo crear el tablero.'));
    }
  }

  async function confirmDelete(board: Board) {
    setPendingDelete(null);
    try {
      await deleteBoard(board.id);
      setError(null);
      await refresh();
    } catch (e) {
      setError(errorMessage(e, 'No se pudo eliminar el tablero.'));
    }
  }

  return (
    <main className="screen">
      <h1>Tableros</h1>
      {error && <p role="alert">{error}</p>}
      <div className={styles.toolbar}>
        <button type="button" className="primary" onClick={createBoard}>
          Nuevo tablero
        </button>
      </div>
      {boards &&
        (boards.length === 0 ? (
          <p className={styles.empty}>Todavía no hay tableros. Crea uno para empezar.</p>
        ) : (
          <ul aria-label="Tableros guardados" className={styles.list}>
            {boards.map((board) => (
              <BoardListItem key={board.id} board={board} onDelete={setPendingDelete} />
            ))}
          </ul>
        ))}
      {pendingDelete && (
        <ConfirmDialog
          title="Eliminar tablero"
          message={`¿Eliminar "${boardDisplayTitle(pendingDelete)}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => void confirmDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
