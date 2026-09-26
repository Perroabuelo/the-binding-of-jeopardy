import { createEmptyBoard, type Board } from '../../src/domain/board';

/**
 * Tablero completo con contenido ficticio para las pruebas.
 * Nunca usar un tablero real aquí: el repositorio es público.
 */
export function makeCompleteBoard(overrides: Partial<Board> = {}): Board {
  const board = createEmptyBoard('fixture-board', 1_700_000_000_000);
  board.title = 'Tablero de prueba';
  board.categories.forEach((category, c) => {
    category.name = `Categoría ${c + 1}`;
    category.clues.forEach((clue, r) => {
      clue.question = `Pregunta ${c + 1}-${r + 1}`;
      clue.answer = `Respuesta ${c + 1}-${r + 1}`;
    });
  });
  return { ...board, ...overrides };
}
