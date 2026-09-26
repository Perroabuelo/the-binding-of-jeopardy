import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCompleteBoard } from '../../tests/fixtures/board';
import type { Board } from '../domain/board';
import type { GameSession } from '../domain/game';
import {
  StorageUnavailable,
  deleteBoard,
  deleteImage,
  getBoard,
  getImage,
  getSession,
  listBoards,
  openJeopardyDb,
  putImage,
  resetDbForTests,
  saveBoard,
  saveSession,
} from './db';

function makeBoardWithImages(id: string, imageIds: string[]): Board {
  const board = makeCompleteBoard({ id });
  imageIds.forEach((imageId, i) => {
    board.categories[i]!.clues[0]!.imageId = imageId;
  });
  return board;
}

function makeSession(id: string, boardSnapshot: Board): GameSession {
  return {
    id,
    boardSnapshot,
    teams: [
      { id: 't1', name: 'Equipo Rojo', score: 300 },
      { id: 't2', name: 'Equipo Azul', score: -100 },
    ],
    usedClues: ['c0-r0', 'c1-r2'],
    phase: { kind: 'clue', clueKey: 'c2-r4', revealed: false },
    updatedAt: 1_700_000_500_000,
  };
}

function imageBlob(content: string): Blob {
  return new Blob([content], { type: 'image/png' });
}

beforeEach(async () => {
  await resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('tableros', () => {
  it('guarda y lee un tablero', async () => {
    const board = makeCompleteBoard({ id: 'b1' });
    await saveBoard(board);
    expect(await getBoard('b1')).toEqual(board);
  });

  it('devuelve null para un tablero inexistente', async () => {
    expect(await getBoard('no-existe')).toBeNull();
  });

  it('sobrescribe un tablero al guardarlo de nuevo', async () => {
    await saveBoard(makeCompleteBoard({ id: 'b1', title: 'Antes' }));
    await saveBoard(makeCompleteBoard({ id: 'b1', title: 'Después' }));
    const boards = await listBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0]!.title).toBe('Después');
  });

  it('lista los tableros del más reciente al más antiguo', async () => {
    await saveBoard(makeCompleteBoard({ id: 'viejo', updatedAt: 1_000 }));
    await saveBoard(makeCompleteBoard({ id: 'nuevo', updatedAt: 3_000 }));
    await saveBoard(makeCompleteBoard({ id: 'medio', updatedAt: 2_000 }));
    expect((await listBoards()).map((b) => b.id)).toEqual(['nuevo', 'medio', 'viejo']);
  });

  it('lista vacía cuando no hay tableros', async () => {
    expect(await listBoards()).toEqual([]);
  });

  it('elimina un tablero', async () => {
    await saveBoard(makeCompleteBoard({ id: 'b1' }));
    await saveBoard(makeCompleteBoard({ id: 'b2' }));
    await deleteBoard('b1');
    expect(await getBoard('b1')).toBeNull();
    expect((await listBoards()).map((b) => b.id)).toEqual(['b2']);
  });

  it('eliminar un tablero inexistente no falla', async () => {
    await expect(deleteBoard('no-existe')).resolves.toBeUndefined();
  });

  it('los datos siguen disponibles tras cerrar y reabrir la base', async () => {
    const board = makeBoardWithImages('b1', ['img-1']);
    await saveBoard(board);
    await putImage('img-1', imageBlob('pixel'));
    await resetDbForTests();
    expect(await getBoard('b1')).toEqual(board);
    expect(await (await getImage('img-1'))!.blob.text()).toBe('pixel');
  });
});

describe('imágenes', () => {
  it('guarda y lee un Blob con su tipo', async () => {
    await putImage('img-1', imageBlob('contenido'));
    const image = await getImage('img-1');
    expect(image).not.toBeNull();
    expect(image!.id).toBe('img-1');
    expect(image!.type).toBe('image/png');
    expect(image!.blob).toBeInstanceOf(Blob);
    expect(await image!.blob.text()).toBe('contenido');
  });

  it('devuelve null para una imagen inexistente', async () => {
    expect(await getImage('no-existe')).toBeNull();
  });

  it('elimina una imagen', async () => {
    await putImage('img-1', imageBlob('x'));
    await deleteImage('img-1');
    expect(await getImage('img-1')).toBeNull();
  });
});

describe('sesiones', () => {
  it('guarda y lee una sesión con puntajes, celdas usadas y pregunta abierta', async () => {
    const session = makeSession('s1', makeCompleteBoard({ id: 'b1' }));
    await saveSession(session);
    expect(await getSession('s1')).toEqual(session);
  });

  it('actualiza una sesión al guardarla de nuevo', async () => {
    const session = makeSession('s1', makeCompleteBoard({ id: 'b1' }));
    await saveSession(session);
    await saveSession({ ...session, phase: { kind: 'board' }, usedClues: [] });
    const stored = await getSession('s1');
    expect(stored!.phase).toEqual({ kind: 'board' });
    expect(stored!.usedClues).toEqual([]);
  });

  it('devuelve null para una sesión inexistente', async () => {
    expect(await getSession('no-existe')).toBeNull();
  });
});

describe('borrado en cascada', () => {
  it('borra las imágenes del tablero eliminado', async () => {
    await saveBoard(makeBoardWithImages('b1', ['img-1', 'img-2']));
    await putImage('img-1', imageBlob('1'));
    await putImage('img-2', imageBlob('2'));
    await deleteBoard('b1');
    expect(await getImage('img-1')).toBeNull();
    expect(await getImage('img-2')).toBeNull();
  });

  it('conserva las imágenes que usa una sesión guardada', async () => {
    const board = makeBoardWithImages('b1', ['img-sesion', 'img-libre']);
    await saveBoard(board);
    await putImage('img-sesion', imageBlob('s'));
    await putImage('img-libre', imageBlob('l'));
    await saveSession(makeSession('s1', makeBoardWithImages('b1', ['img-sesion'])));

    await deleteBoard('b1');

    expect(await getBoard('b1')).toBeNull();
    expect(await getImage('img-sesion')).not.toBeNull();
    expect(await getImage('img-libre')).toBeNull();
  });

  it('no toca las imágenes de otros tableros', async () => {
    await saveBoard(makeBoardWithImages('b1', ['img-1']));
    await saveBoard(makeBoardWithImages('b2', ['img-2']));
    await putImage('img-1', imageBlob('1'));
    await putImage('img-2', imageBlob('2'));
    await deleteBoard('b1');
    expect(await getImage('img-2')).not.toBeNull();
    expect(await getBoard('b2')).not.toBeNull();
  });
});

describe('almacenamiento no disponible', () => {
  it('convierte un error de cuota al guardar en StorageUnavailable', async () => {
    await openJeopardyDb();
    const quota = new DOMException('Cuota excedida', 'QuotaExceededError');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw quota;
    });

    const error = await saveBoard(makeCompleteBoard({ id: 'b1' })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageUnavailable);
    expect((error as StorageUnavailable).cause).toBe(quota);
    expect((error as StorageUnavailable).message).toMatch(/no se guardaron/);
    await expect(putImage('img-1', imageBlob('x'))).rejects.toBeInstanceOf(StorageUnavailable);
  });

  it('convierte un error de transacción en StorageUnavailable', async () => {
    await openJeopardyDb();
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(() => {
      throw new DOMException('Conexión cerrada', 'InvalidStateError');
    });
    await expect(listBoards()).rejects.toBeInstanceOf(StorageUnavailable);
    await expect(deleteBoard('b1')).rejects.toBeInstanceOf(StorageUnavailable);
  });

  it('convierte un fallo al abrir la base en StorageUnavailable y reintenta después', async () => {
    const factory = globalThis.indexedDB;
    vi.spyOn(factory, 'open').mockImplementationOnce(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });
    await expect(listBoards()).rejects.toBeInstanceOf(StorageUnavailable);
    await expect(listBoards()).resolves.toEqual([]);
  });

  it('falla con StorageUnavailable si el navegador no tiene IndexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(getBoard('b1')).rejects.toBeInstanceOf(StorageUnavailable);
  });
});
