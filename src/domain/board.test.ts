import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import {
  allClueKeys,
  boardImageIds,
  clueImageIds,
  clueKey,
  CLUE_VALUES,
  createEmptyBoard,
  getClue,
  parseClueKey,
} from './board';

describe('createEmptyBoard', () => {
  it('crea 6 categorías vacías con 5 celdas de valores 100 a 500', () => {
    const board = createEmptyBoard('b1', 123);
    expect(board.id).toBe('b1');
    expect(board.title).toBe('');
    expect(board.createdAt).toBe(123);
    expect(board.updatedAt).toBe(123);
    expect(board.categories).toHaveLength(6);
    for (const category of board.categories) {
      expect(category.name).toBe('');
      expect(category.clues.map((clue) => clue.value)).toEqual([100, 200, 300, 400, 500]);
      for (const clue of category.clues) {
        expect(clue.question).toBe('');
        expect(clue.answer).toBe('');
        expect(clue.imageId).toBeUndefined();
      }
    }
  });

  it('crea la cantidad de categorías indicada', () => {
    expect(createEmptyBoard('b1', 0, 3).categories).toHaveLength(3);
    expect(createEmptyBoard('b1', 0, 8).categories).toHaveLength(8);
  });

  it('no comparte referencias entre categorías', () => {
    const board = createEmptyBoard('b1', 0);
    board.categories[0]!.clues[0]!.question = 'x';
    expect(board.categories[1]!.clues[0]!.question).toBe('');
  });
});

describe('claves de celda', () => {
  it('ida y vuelta entre clave e índices', () => {
    expect(clueKey(2, 3)).toBe('c2-r3');
    expect(parseClueKey('c2-r3')).toEqual({ categoryIndex: 2, rowIndex: 3 });
  });

  it('acepta cualquier categoría: la pertenencia al tablero la resuelve getClue', () => {
    expect(parseClueKey('c7-r4')).toEqual({ categoryIndex: 7, rowIndex: 4 });
  });

  it('rechaza claves inválidas o con la fila fuera de rango', () => {
    expect(parseClueKey('x')).toBeNull();
    expect(parseClueKey('c0-r5')).toBeNull();
  });

  it.each([
    [3, 15],
    [6, 30],
    [8, 40],
  ])(
    'allClueKeys devuelve las celdas de un tablero de %i categorías sin repetir',
    (count, total) => {
      const keys = allClueKeys(createEmptyBoard('b1', 0, count));
      expect(keys).toHaveLength(total);
      expect(new Set(keys).size).toBe(total);
      expect(keys.at(-1)).toBe(clueKey(count - 1, 4));
    },
  );

  it('getClue devuelve la celda correspondiente', () => {
    const board = makeCompleteBoard();
    expect(getClue(board, 'c1-r2')).toMatchObject({
      value: CLUE_VALUES[2],
      question: 'Pregunta 2-3',
    });
    expect(getClue(board, 'nope')).toBeNull();
    expect(getClue(board, 'c6-r0')).toBeNull();
  });
});

describe('imágenes usadas', () => {
  it('clueImageIds devuelve nada para una celda sin imagen', () => {
    expect(clueImageIds({ value: 100, question: 'p', answer: 'r' })).toEqual([]);
  });

  it('clueImageIds devuelve la imagen de la pregunta', () => {
    expect(clueImageIds({ value: 100, question: 'p', answer: 'r', imageId: 'img-1' })).toEqual([
      'img-1',
    ]);
  });

  it('clueImageIds devuelve las imágenes de la pregunta y de la respuesta', () => {
    expect(
      clueImageIds({
        value: 100,
        question: 'p',
        answer: 'r',
        imageId: 'img-p',
        answerImageId: 'img-r',
      }),
    ).toEqual(['img-p', 'img-r']);
  });

  it('boardImageIds devuelve un conjunto vacío si el tablero no tiene imágenes', () => {
    expect(boardImageIds(makeCompleteBoard()).size).toBe(0);
  });

  it('boardImageIds reúne las imágenes de todas las celdas sin repetir', () => {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[0]!.imageId = 'img-1';
    board.categories[2]!.clues[4]!.imageId = 'img-2';
    board.categories[4]!.clues[1]!.imageId = 'img-1';
    expect([...boardImageIds(board)].sort()).toEqual(['img-1', 'img-2']);
  });

  it('boardImageIds incluye las imágenes de las respuestas', () => {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[0]!.imageId = 'img-p';
    board.categories[1]!.clues[3]!.answerImageId = 'img-r';
    board.categories[2]!.clues[2]!.answerImageId = 'img-p';
    expect([...boardImageIds(board)].sort()).toEqual(['img-p', 'img-r']);
  });
});
