import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { allClueKeys, createEmptyBoard } from './board';
import { validateBoard } from './validation';

describe('validateBoard', () => {
  it('marca como listo el tablero completo', () => {
    expect(validateBoard(makeCompleteBoard())).toEqual({ ready: true, missing: [] });
  });

  it.each([3, 6, 8])(
    'señala título, las categorías y las celdas de un tablero vacío de %i categorías',
    (count) => {
      const board = createEmptyBoard('b1', 0, count);
      const result = validateBoard(board);
      expect(result.ready).toBe(false);
      expect(result.missing).toContainEqual({ kind: 'title' });
      for (let c = 0; c < count; c++) {
        expect(result.missing).toContainEqual({ kind: 'categoryName', categoryIndex: c });
      }
      for (const key of allClueKeys(board)) {
        expect(result.missing).toContainEqual({ kind: 'clue', clueKey: key, field: 'question' });
        expect(result.missing).toContainEqual({ kind: 'clue', clueKey: key, field: 'answer' });
      }
      expect(result.missing).toHaveLength(1 + count + count * 10);
    },
  );

  it.each([3, 8])('marca como listo un tablero completo de %i categorías', (count) => {
    expect(validateBoard(makeCompleteBoard({}, count))).toEqual({ ready: true, missing: [] });
  });

  it('señala la categoría agregada vacía', () => {
    const board = makeCompleteBoard();
    board.categories.push(createEmptyBoard('b2', 0, 3).categories[0]!);
    const result = validateBoard(board);
    expect(result.ready).toBe(false);
    expect(result.missing).toContainEqual({ kind: 'categoryName', categoryIndex: 6 });
    expect(result.missing).toContainEqual({ kind: 'clue', clueKey: 'c6-r4', field: 'answer' });
    expect(result.missing).toHaveLength(1 + 10);
  });

  it('señala una cantidad de categorías fuera de rango', () => {
    expect(validateBoard(makeCompleteBoard({}, 2))).toEqual({
      ready: false,
      missing: [{ kind: 'categoryCount' }],
    });
    expect(validateBoard(makeCompleteBoard({}, 9))).toEqual({
      ready: false,
      missing: [{ kind: 'categoryCount' }],
    });
  });

  it('señala solo la celda a la que le falta la respuesta', () => {
    const board = makeCompleteBoard();
    board.categories[1]!.clues[2]!.answer = '';
    expect(validateBoard(board)).toEqual({
      ready: false,
      missing: [{ kind: 'clue', clueKey: 'c1-r2', field: 'answer' }],
    });
  });

  it('considera vacío el texto con solo espacios', () => {
    const board = makeCompleteBoard({ title: '   ' });
    board.categories[3]!.name = '\t ';
    board.categories[0]!.clues[4]!.question = ' \n ';
    expect(validateBoard(board)).toEqual({
      ready: false,
      missing: [
        { kind: 'title' },
        { kind: 'categoryName', categoryIndex: 3 },
        { kind: 'clue', clueKey: 'c0-r4', field: 'question' },
      ],
    });
  });

  it('no exige imagen para estar listo', () => {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[0]!.imageId = 'img-1';
    expect(validateBoard(board).ready).toBe(true);
  });
});
