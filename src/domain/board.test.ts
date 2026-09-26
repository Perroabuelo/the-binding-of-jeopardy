import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import {
  addCategory,
  allClueKeys,
  boardImageIds,
  categoryHasContent,
  clueImageIds,
  clueKey,
  CLUE_VALUES,
  createEmptyBoard,
  getClue,
  maxClueValue,
  moveCategory,
  parseClueKey,
  removeCategory,
  type Board,
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

const names = (board: Board) => board.categories.map((category) => category.name);

describe('addCategory', () => {
  it('agrega una categoría vacía al final sin tocar las demás', () => {
    const board = makeCompleteBoard();
    const next = addCategory(board);
    expect(next.categories).toHaveLength(7);
    expect(next.categories.slice(0, 6)).toEqual(board.categories);
    expect(next.categories[6]).toEqual(createEmptyBoard('x', 0, 1).categories[0]);
    expect(board.categories).toHaveLength(6);
  });

  it('con 8 categorías devuelve la misma referencia', () => {
    const board = makeCompleteBoard({}, 8);
    expect(addCategory(board)).toBe(board);
  });
});

describe('removeCategory', () => {
  it('quita la categoría y las demás mantienen su orden', () => {
    const next = removeCategory(makeCompleteBoard(), 1);
    expect(names(next)).toEqual([
      'Categoría 1',
      'Categoría 3',
      'Categoría 4',
      'Categoría 5',
      'Categoría 6',
    ]);
  });

  it('con 3 categorías devuelve la misma referencia', () => {
    const board = makeCompleteBoard({}, 3);
    expect(removeCategory(board, 0)).toBe(board);
  });

  it('con un índice fuera de rango devuelve la misma referencia', () => {
    const board = makeCompleteBoard();
    expect(removeCategory(board, -1)).toBe(board);
    expect(removeCategory(board, 6)).toBe(board);
    expect(removeCategory(board, 1.5)).toBe(board);
  });
});

describe('moveCategory', () => {
  it('mueve una categoría a la posición siguiente', () => {
    const next = moveCategory(makeCompleteBoard({}, 3), 0, 1);
    expect(names(next)).toEqual(['Categoría 2', 'Categoría 1', 'Categoría 3']);
  });

  it('mueve una categoría hacia el centro y hacia los extremos', () => {
    const board = makeCompleteBoard({}, 5);
    expect(names(moveCategory(board, 4, 2))).toEqual([
      'Categoría 1',
      'Categoría 2',
      'Categoría 5',
      'Categoría 3',
      'Categoría 4',
    ]);
    expect(names(moveCategory(board, 2, 0))).toEqual([
      'Categoría 3',
      'Categoría 1',
      'Categoría 2',
      'Categoría 4',
      'Categoría 5',
    ]);
    expect(names(moveCategory(board, 0, 4))).toEqual([
      'Categoría 2',
      'Categoría 3',
      'Categoría 4',
      'Categoría 5',
      'Categoría 1',
    ]);
  });

  it('conserva todo el contenido de la categoría movida, incluidas las imágenes', () => {
    const board = makeCompleteBoard();
    board.categories[0]!.clues[2]!.imageId = 'img-p';
    board.categories[0]!.clues[3]!.answerImageId = 'img-r';
    const moved = structuredClone(board.categories[0]!);
    const next = moveCategory(board, 0, 1);
    expect(next.categories[1]).toEqual(moved);
    expect(next.categories[0]).toEqual(board.categories[1]);
  });

  it('con índices inválidos o iguales devuelve la misma referencia', () => {
    const board = makeCompleteBoard();
    expect(moveCategory(board, 0, -1)).toBe(board);
    expect(moveCategory(board, 5, 6)).toBe(board);
    expect(moveCategory(board, -1, 0)).toBe(board);
    expect(moveCategory(board, 2, 2)).toBe(board);
  });
});

describe('categoryHasContent', () => {
  const empty = () => createEmptyBoard('x', 0, 1).categories[0]!;

  it('una categoría vacía no tiene contenido', () => {
    expect(categoryHasContent(empty())).toBe(false);
  });

  it('el texto con solo espacios no cuenta como contenido', () => {
    const category = empty();
    category.name = '  ';
    category.clues[0]!.question = '\n';
    expect(categoryHasContent(category)).toBe(false);
  });

  it.each([
    ['nombre', (category: ReturnType<typeof empty>) => (category.name = 'Historia')],
    ['pregunta', (category: ReturnType<typeof empty>) => (category.clues[2]!.question = 'p')],
    ['respuesta', (category: ReturnType<typeof empty>) => (category.clues[4]!.answer = 'r')],
    [
      'imagen de pregunta',
      (category: ReturnType<typeof empty>) => (category.clues[1]!.imageId = 'img-p'),
    ],
    [
      'imagen de respuesta',
      (category: ReturnType<typeof empty>) => (category.clues[3]!.answerImageId = 'img-r'),
    ],
  ])('una categoría con %s tiene contenido', (_, fill) => {
    const category = empty();
    fill(category);
    expect(categoryHasContent(category)).toBe(true);
  });
});

describe('maxClueValue', () => {
  it('devuelve 500 en un tablero de 100 a 500', () => {
    expect(maxClueValue(makeCompleteBoard())).toBe(500);
    expect(maxClueValue(createEmptyBoard('b1', 0, 3))).toBe(500);
  });
});
