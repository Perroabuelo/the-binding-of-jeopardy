import { useEffect, useState } from 'react';
import { createEmptyBoard, type Board } from '../../domain/board';
import { listBoards, saveBoard } from '../../storage/db';
import { newId } from '../lib/ids';
import { navigate, routeHref } from '../router';

export function BoardListScreen() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBoards()
      .then(setBoards)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function createBoard() {
    const board = createEmptyBoard(newId(), Date.now());
    try {
      await saveBoard(board);
      navigate({ name: 'editor', boardId: board.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="screen">
      <h1>Tableros</h1>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="primary" onClick={createBoard}>
        Nuevo tablero
      </button>
      {boards && (
        <ul aria-label="Tableros guardados">
          {boards.map((board) => (
            <li key={board.id}>
              <a href={routeHref({ name: 'editor', boardId: board.id })}>
                {board.title || 'Tablero sin título'}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
