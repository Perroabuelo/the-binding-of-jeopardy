import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { clueImageIds, removeCategory } from '../../domain/board';
import { getImage, putImage, resetDbForTests, saveBoard, saveSession } from '../../storage/db';
import { deleteImageIfUnused } from './imageCleanup';

function imageBlob(): Blob {
  return new Blob(['x'], { type: 'image/png' });
}

beforeEach(async () => {
  await resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
});

describe('deleteImageIfUnused', () => {
  it('borra la imagen si nada la usa', async () => {
    await saveBoard(makeCompleteBoard({ id: 'b1' }));
    await putImage('img-1', imageBlob());

    expect(await deleteImageIfUnused('img-1')).toBe(true);
    expect(await getImage('img-1')).toBeNull();
  });

  it('no borra una imagen que otro tablero usa como imagen de respuesta', async () => {
    const board = makeCompleteBoard({ id: 'b2' });
    board.categories[1]!.clues[3]!.answerImageId = 'img-1';
    await saveBoard(board);
    await putImage('img-1', imageBlob());

    expect(await deleteImageIfUnused('img-1')).toBe(false);
    expect(await getImage('img-1')).not.toBeNull();
  });

  it('no borra una imagen que una sesión usa como imagen de respuesta', async () => {
    const snapshot = makeCompleteBoard({ id: 'b1' });
    snapshot.categories[0]!.clues[0]!.answerImageId = 'img-1';
    await saveSession({
      id: 's1',
      boardSnapshot: snapshot,
      teams: [{ id: 't1', name: 'Equipo Azul', score: 0 }],
      usedClues: [],
      phase: { kind: 'board' },
      updatedAt: 0,
    });
    await putImage('img-1', imageBlob());

    expect(await deleteImageIfUnused('img-1')).toBe(false);
    expect(await getImage('img-1')).not.toBeNull();
  });

  it('al quitar una categoría borra sus imágenes salvo las que usa otro tablero', async () => {
    const board = makeCompleteBoard({ id: 'b1' });
    board.categories[2]!.clues[0]!.imageId = 'img-sola';
    board.categories[2]!.clues[3]!.answerImageId = 'img-compartida';
    const other = makeCompleteBoard({ id: 'b2' });
    other.categories[0]!.clues[1]!.imageId = 'img-compartida';
    await saveBoard(other);
    await putImage('img-sola', imageBlob());
    await putImage('img-compartida', imageBlob());

    const removedIds = board.categories[2]!.clues.flatMap(clueImageIds);
    await saveBoard(removeCategory(board, 2));
    for (const id of removedIds) await deleteImageIfUnused(id);

    expect(await getImage('img-sola')).toBeNull();
    expect(await getImage('img-compartida')).not.toBeNull();
  });
});
