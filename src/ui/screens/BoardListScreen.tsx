import { useEffect, useState, type ChangeEvent } from 'react';
import { createEmptyBoard, type Board } from '../../domain/board';
import { createBoardFromSample, SAMPLE_BOARDS, type SampleBoard } from '../../domain/samples';
import { deleteBoard, listBoards, saveBoard } from '../../storage/db';
import { getDesktopApi } from '../../platform/desktop';
import { boardBackup } from '../boards/boardBackup';
import { BoardListItem } from '../boards/BoardListItem';
import { downloadBoardFile, importBoardFile } from '../boards/boardFiles';
import { SampleDialog } from '../boards/SampleDialog';
import { ConfirmDialog } from '../lib/ConfirmDialog';
import { errorMessage } from '../boards/errors';
import { boardDisplayTitle } from '../boards/format';
import { newId } from '../lib/ids';
import { navigate } from '../router';
import styles from './BoardListScreen.module.css';

export function BoardListScreen() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Board | null>(null);
  const [importing, setImporting] = useState(false);
  const [choosingSample, setChoosingSample] = useState(false);

  useEffect(() => {
    listBoards()
      .then(setBoards)
      .catch((e: unknown) => setError(errorMessage(e, 'No se pudieron cargar los tableros.')));
  }, []);

  function showError(message: string) {
    setNotice(null);
    setError(message);
  }

  function showNotice(message: string) {
    setError(null);
    setNotice(message);
  }

  async function createBoard() {
    const board = createEmptyBoard(newId(), Date.now());
    try {
      await saveBoard(board);
      void boardBackup.backupNow(board);
      navigate({ name: 'editor', boardId: board.id });
    } catch (e) {
      showError(errorMessage(e, 'No se pudo crear el tablero.'));
    }
  }

  async function createFromSample(sample: SampleBoard) {
    setChoosingSample(false);
    const board = createBoardFromSample(sample, newId(), Date.now());
    try {
      await saveBoard(board);
    } catch (e) {
      showError(errorMessage(e, 'No se pudo crear el tablero.'));
      return;
    }
    void boardBackup.backupNow(board);
    // El nuevo es el más reciente, así que va primero.
    setBoards((prev) => [board, ...(prev ?? [])]);
    showNotice(`Se creó "${boardDisplayTitle(board)}" desde el ejemplo.`);
  }

  async function confirmDelete(board: Board) {
    setPendingDelete(null);
    try {
      await deleteBoard(board.id);
    } catch (e) {
      showError(errorMessage(e, 'No se pudo eliminar el tablero.'));
      return;
    }
    void boardBackup.trash(board.id);
    // Se actualiza en memoria: recargar podría fallar y ocultar que ya se eliminó.
    setBoards((prev) => prev?.filter((b) => b.id !== board.id) ?? null);
    showNotice(`Se eliminó "${boardDisplayTitle(board)}".`);
  }

  async function exportBoardFile(board: Board) {
    try {
      await downloadBoardFile(board);
      showNotice(`Se exportó "${boardDisplayTitle(board)}".`);
    } catch (e) {
      showError(errorMessage(e, 'No se pudo exportar el tablero.'));
    }
  }

  async function openBackupFolder() {
    try {
      await getDesktopApi()?.backup.openFolder();
    } catch (e) {
      showError(errorMessage(e, 'No se pudo abrir la carpeta de respaldos.'));
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const board = await importBoardFile(file);
      void boardBackup.backupNow(board);
      // El importado es el más reciente, así que va primero.
      setBoards((prev) => [board, ...(prev ?? []).filter((b) => b.id !== board.id)]);
      showNotice(`Se importó "${boardDisplayTitle(board)}".`);
    } catch (e) {
      showError(errorMessage(e, 'No se pudo importar el tablero.'));
    } finally {
      // Permite volver a elegir el mismo archivo.
      input.value = '';
      setImporting(false);
    }
  }

  return (
    <main className="screen">
      <h1>Tableros</h1>
      {error && <p role="alert">{error}</p>}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <div className={styles.toolbar}>
        <button type="button" className="primary" onClick={createBoard}>
          Nuevo tablero
        </button>
        <button type="button" onClick={() => setChoosingSample(true)}>
          Crear desde ejemplo
        </button>
        <label className={styles.import}>
          Importar tablero
          <input
            type="file"
            accept=".json,application/json"
            disabled={importing}
            onChange={(event) => void handleImport(event)}
          />
        </label>
        {getDesktopApi() && (
          <button type="button" onClick={() => void openBackupFolder()}>
            Abrir carpeta de respaldos
          </button>
        )}
      </div>
      {boards &&
        (boards.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay tableros. Crea uno nuevo o parte desde un ejemplo.
          </p>
        ) : (
          <ul aria-label="Tableros guardados" className={styles.list}>
            {boards.map((board) => (
              <BoardListItem
                key={board.id}
                board={board}
                onExport={(target) => void exportBoardFile(target)}
                onDelete={setPendingDelete}
              />
            ))}
          </ul>
        ))}
      {choosingSample && (
        <SampleDialog
          samples={SAMPLE_BOARDS}
          onChoose={(sample) => void createFromSample(sample)}
          onCancel={() => setChoosingSample(false)}
        />
      )}
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
