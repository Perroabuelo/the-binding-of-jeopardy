import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import { allClueKeys, createEmptyBoard } from './board';
import { validateBoard } from './validation';

describe('validateBoard', () => {
  it('marca como listo el tablero completo', () => {
    expect(validateBoard(makeCompleteBoard())).toEqual({ ready: true, missing: [] });
  });

  it('señala título, las 5 categorías y las 25 celdas de un tablero vacío', () => {
    const result = validateBoard(createEmptyBoard('b1', 0));
    expect(result.ready).toBe(false);
    expect(result.missing).toContainEqual({ kind: 'title' });
    for (let c = 0; c < 5; c++) {
      expect(result.missing).toContainEqual({ kind: 'categoryName', categoryIndex: c });
    }
    for (const key of allClueKeys()) {
      expect(result.missing).toContainEqual({ kind: 'clue', clueKey: key, field: 'question' });
      expect(result.missing).toContainEqual({ kind: 'clue', clueKey: key, field: 'answer' });
    }
    expect(result.missing).toHaveLength(1 + 5 + 50);
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
