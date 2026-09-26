import { describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import type { Board } from './board';
import { exportBoard, exportFileName, importBoard, ImportError } from './exchange';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
const NOW = 1_800_000_000_000;

function makeIdGenerator(prefix = 'id') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function boardWithImages(): Board {
  const board = makeCompleteBoard();
  board.categories[0]!.clues[0]!.imageId = 'img-a';
  board.categories[2]!.clues[4]!.imageId = 'img-b';
  // La misma imagen usada en dos celdas.
  board.categories[4]!.clues[1]!.imageId = 'img-a';
  return board;
}

function exportedFile(): Record<string, unknown> {
  return JSON.parse(exportBoard(boardWithImages(), { 'img-a': PNG, 'img-b': JPEG })) as Record<
    string,
    unknown
  >;
}

function expectImportError(json: string): ImportError {
  let error: unknown;
  try {
    importBoard(json, { makeId: makeIdGenerator(), now: NOW });
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(ImportError);
  expect((error as ImportError).message).not.toBe('');
  return error as ImportError;
}

describe('exportBoard', () => {
  it('incluye formato, versión, tablero e imágenes referenciadas', () => {
    const board = boardWithImages();
    const file = JSON.parse(exportBoard(board, { 'img-a': PNG, 'img-b': JPEG })) as unknown;
    expect(file).toEqual({
      format: 'the-binding-of-jeopardy',
      schemaVersion: 1,
      board,
      images: { 'img-a': PNG, 'img-b': JPEG },
    });
  });

  it('omite las imágenes que el tablero no referencia', () => {
    const file = JSON.parse(
      exportBoard(boardWithImages(), { 'img-a': PNG, 'img-b': JPEG, 'img-suelta': PNG }),
    ) as { images: Record<string, string> };
    expect(Object.keys(file.images).sort()).toEqual(['img-a', 'img-b']);
  });

  it('falla si falta una imagen referenciada', () => {
    expect(() => exportBoard(boardWithImages(), { 'img-a': PNG })).toThrow(/img-b/);
  });
});

describe('importBoard', () => {
  it('ida y vuelta: mismo contenido e imágenes con ids nuevos', () => {
    const original = boardWithImages();
    const json = exportBoard(original, { 'img-a': PNG, 'img-b': JPEG });
    const { board, images } = importBoard(json, { makeId: makeIdGenerator('nuevo'), now: NOW });

    expect(board.id).not.toBe(original.id);
    expect(board.title).toBe(original.title);
    expect(board.schemaVersion).toBe(1);
    expect(board.createdAt).toBe(NOW);
    expect(board.updatedAt).toBe(NOW);

    board.categories.forEach((category, c) => {
      const source = original.categories[c]!;
      expect(category.name).toBe(source.name);
      category.clues.forEach((clue, r) => {
        const sourceClue = source.clues[r]!;
        expect(clue.value).toBe(sourceClue.value);
        expect(clue.question).toBe(sourceClue.question);
        expect(clue.answer).toBe(sourceClue.answer);
        if (sourceClue.imageId === undefined) {
          expect(clue.imageId).toBeUndefined();
        } else {
          expect(clue.imageId).toBeDefined();
          expect(clue.imageId).not.toBe(sourceClue.imageId);
          expect(images[clue.imageId!]).toBe(sourceClue.imageId === 'img-a' ? PNG : JPEG);
        }
      });
    });

    // Una imagen compartida por dos celdas se importa una sola vez.
    expect(Object.keys(images)).toHaveLength(2);
    expect(board.categories[0]!.clues[0]!.imageId).toBe(board.categories[4]!.clues[1]!.imageId);
  });

  it('ida y vuelta: conserva las imágenes de respuesta con ids nuevos', () => {
    const original = boardWithImages();
    original.categories[1]!.clues[2]!.answerImageId = 'img-r';
    const json = exportBoard(original, { 'img-a': PNG, 'img-b': JPEG, 'img-r': PNG });
    const { board, images } = importBoard(json, { makeId: makeIdGenerator('nuevo'), now: NOW });

    const answerImageId = board.categories[1]!.clues[2]!.answerImageId;
    expect(answerImageId).toBeDefined();
    expect(answerImageId).not.toBe('img-r');
    expect(images[answerImageId!]).toBe(PNG);
    expect(Object.keys(images)).toHaveLength(3);
    for (const category of board.categories) {
      for (const clue of category.clues) {
        if (clue !== board.categories[1]!.clues[2]) expect(clue.answerImageId).toBeUndefined();
      }
    }
  });

  it('importa un archivo sin answerImageId, de una versión anterior', () => {
    const file = exportedFile();
    const { board, images } = importBoard(JSON.stringify(file), {
      makeId: makeIdGenerator(),
      now: NOW,
    });
    expect(Object.keys(images)).toHaveLength(2);
    expect(board.categories[0]!.clues[0]!.imageId).toBeDefined();
    for (const category of board.categories) {
      for (const clue of category.clues) expect('answerImageId' in clue).toBe(false);
    }
  });

  it('una imagen compartida entre pregunta y respuesta se copia una sola vez', () => {
    const original = boardWithImages();
    original.categories[0]!.clues[0]!.answerImageId = 'img-a';
    original.categories[3]!.clues[3]!.answerImageId = 'img-b';
    const json = exportBoard(original, { 'img-a': PNG, 'img-b': JPEG });
    const { board, images } = importBoard(json, { makeId: makeIdGenerator(), now: NOW });

    expect(Object.keys(images)).toHaveLength(2);
    const first = board.categories[0]!.clues[0]!;
    expect(first.answerImageId).toBe(first.imageId);
    expect(board.categories[3]!.clues[3]!.answerImageId).toBe(
      board.categories[2]!.clues[4]!.imageId,
    );
  });

  it('ida y vuelta de un tablero sin imágenes', () => {
    const original = makeCompleteBoard();
    const { board, images } = importBoard(exportBoard(original, {}), {
      makeId: makeIdGenerator(),
      now: NOW,
    });
    expect(images).toEqual({});
    expect(board.categories).toEqual(original.categories);
  });

  it('importar dos veces el mismo archivo genera tableros e imágenes con ids distintos', () => {
    const json = exportBoard(boardWithImages(), { 'img-a': PNG, 'img-b': JPEG });
    const makeId = makeIdGenerator();
    const first = importBoard(json, { makeId, now: NOW });
    const second = importBoard(json, { makeId, now: NOW + 1 });

    expect(first.board.id).not.toBe(second.board.id);
    const firstIds = Object.keys(first.images);
    const secondIds = Object.keys(second.images);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    expect(first.board.categories.map((c) => c.name)).toEqual(
      second.board.categories.map((c) => c.name),
    );
  });

  it('no incluye imágenes del archivo que ninguna celda referencia', () => {
    const file = exportedFile();
    file.images = { ...(file.images as Record<string, string>), 'img-suelta': PNG };
    const { images } = importBoard(JSON.stringify(file), { makeId: makeIdGenerator(), now: NOW });
    expect(Object.keys(images)).toHaveLength(2);
  });

  it('acepta los tipos de imagen permitidos', () => {
    for (const type of ['png', 'jpeg', 'gif', 'webp']) {
      const file = exportedFile();
      file.images = { 'img-a': `data:image/${type};base64,AAAA`, 'img-b': PNG };
      expect(() =>
        importBoard(JSON.stringify(file), { makeId: makeIdGenerator(), now: NOW }),
      ).not.toThrow();
    }
  });

  describe('rechaza archivos inválidos', () => {
    it('JSON que no parsea', () => {
      expectImportError('{ esto no es json');
      expectImportError('');
    });

    it('JSON que no es un objeto', () => {
      expectImportError('null');
      expectImportError('[]');
      expectImportError('"texto"');
    });

    it('formato ajeno', () => {
      const file = exportedFile();
      file.format = 'otra-aplicacion';
      expectImportError(JSON.stringify(file));
      expectImportError(JSON.stringify({ hola: 'mundo' }));
    });

    it('versión desconocida', () => {
      const file = exportedFile();
      file.schemaVersion = 2;
      const error = expectImportError(JSON.stringify(file));
      expect(error.message).toMatch(/versión/);
    });

    it('sin tablero', () => {
      const file = exportedFile();
      delete file.board;
      expectImportError(JSON.stringify(file));
    });

    it('menos o más de 5 categorías', () => {
      const four = exportedFile();
      (four.board as Board).categories.pop();
      expectImportError(JSON.stringify(four));

      const six = exportedFile();
      const board = six.board as Board;
      board.categories.push(board.categories[1]!);
      expectImportError(JSON.stringify(six));
    });

    it('una categoría con menos o más de 5 preguntas', () => {
      const four = exportedFile();
      (four.board as Board).categories[3]!.clues.pop();
      expectImportError(JSON.stringify(four));

      const six = exportedFile();
      const clues = (six.board as Board).categories[3]!.clues;
      clues.push({ ...clues[4]! });
      expectImportError(JSON.stringify(six));
    });

    it('valores distintos de 100 a 500 o fuera de orden', () => {
      const wrongValue = exportedFile();
      (
        wrongValue.board as { categories: { clues: { value: number }[] }[] }
      ).categories[1]!.clues[2]!.value = 350;
      expectImportError(JSON.stringify(wrongValue));

      const unordered = exportedFile();
      const clues = (unordered.board as Board).categories[1]!.clues;
      [clues[0], clues[1]] = [clues[1]!, clues[0]!];
      expectImportError(JSON.stringify(unordered));
    });

    it('campos con tipos incorrectos', () => {
      const file = exportedFile();
      (
        file.board as { categories: { clues: { question: unknown }[] }[] }
      ).categories[0]!.clues[3]!.question = 42;
      expectImportError(JSON.stringify(file));

      const noTitle = exportedFile();
      delete (noTitle.board as Partial<Board>).title;
      expectImportError(JSON.stringify(noTitle));
    });

    it('imageId referenciado sin imagen', () => {
      const file = exportedFile();
      delete (file.images as Record<string, string>)['img-b'];
      expectImportError(JSON.stringify(file));

      const noImages = exportedFile();
      delete noImages.images;
      expectImportError(JSON.stringify(noImages));
    });

    it('answerImageId referenciado sin imagen', () => {
      const board = boardWithImages();
      board.categories[1]!.clues[1]!.answerImageId = 'img-r';
      const file = JSON.parse(
        exportBoard(board, { 'img-a': PNG, 'img-b': JPEG, 'img-r': PNG }),
      ) as Record<string, unknown>;
      delete (file.images as Record<string, string>)['img-r'];
      const error = expectImportError(JSON.stringify(file));
      expect(error.message).toMatch(/falta una imagen/);
    });

    it('data URL que no es una imagen permitida en base64', () => {
      const invalid = [
        'data:image/svg+xml;base64,PHN2Zz4=',
        'data:text/html;base64,PGgxPg==',
        'data:image/png,iVBORw0KGgo=',
        'data:image/png;base64,',
        'data:image/png;base64,no es base64!',
        'https://example.com/imagen.png',
      ];
      for (const dataUrl of invalid) {
        const file = exportedFile();
        (file.images as Record<string, string>)['img-a'] = dataUrl;
        expectImportError(JSON.stringify(file));
      }
    });
  });
});

describe('exportFileName', () => {
  it('usa el título con la extensión .jeopardy.json', () => {
    expect(exportFileName(makeCompleteBoard({ title: 'Cumpleaños de prueba' }))).toBe(
      'Cumpleaños de prueba.jeopardy.json',
    );
  });

  it('quita caracteres inválidos para nombres de archivo', () => {
    expect(exportFileName(makeCompleteBoard({ title: 'Ronda 1: ¿qué/cuál? <final>*' }))).toBe(
      'Ronda 1 ¿qué cuál final.jeopardy.json',
    );
    expect(exportFileName(makeCompleteBoard({ title: 'a\\b|c"d\te' }))).toBe(
      'a b c d e.jeopardy.json',
    );
  });

  it('quita puntos y espacios en los extremos', () => {
    expect(exportFileName(makeCompleteBoard({ title: '  ..Tablero.  ' }))).toBe(
      'Tablero.jeopardy.json',
    );
  });

  it('usa "tablero" si el título queda vacío', () => {
    expect(exportFileName(makeCompleteBoard({ title: '' }))).toBe('tablero.jeopardy.json');
    expect(exportFileName(makeCompleteBoard({ title: '   ' }))).toBe('tablero.jeopardy.json');
    expect(exportFileName(makeCompleteBoard({ title: '???' }))).toBe('tablero.jeopardy.json');
  });

  it('evita nombres reservados de Windows', () => {
    expect(exportFileName(makeCompleteBoard({ title: 'CON' }))).toBe('CON_.jeopardy.json');
  });

  it('limita el largo del nombre', () => {
    const name = exportFileName(makeCompleteBoard({ title: 'x'.repeat(300) }));
    expect(name).toBe(`${'x'.repeat(100)}.jeopardy.json`);
  });
});
