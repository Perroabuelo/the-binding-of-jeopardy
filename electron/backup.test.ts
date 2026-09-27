import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { backupFileName } from '../src/domain/backup';
import { createBackupStore, TRASH_DIR_NAME } from './backup';

const BOARD_ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const OTHER_ID = 'ffff0000-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
let root: string;
let dir: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'jeopardy-backup-'));
  dir = path.join(root, 'Respaldos');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function file(title: string, boardId = BOARD_ID, json = `{"title":"${title}"}`) {
  return { boardId, fileName: backupFileName({ id: boardId, title }), json };
}

const visibleFiles = (folder: string) =>
  existsSync(folder)
    ? readdirSync(folder)
        .filter((name) => name !== TRASH_DIR_NAME)
        .sort()
    : [];

describe('createBackupStore', () => {
  it('escribe el respaldo, creando la carpeta', async () => {
    const store = createBackupStore(dir);
    await store.writeBoard(file('Mi tablero'));
    expect(visibleFiles(dir)).toEqual(['Mi tablero (a1b2c3d4).jeopardy.json']);
    expect(readFileSync(path.join(dir, 'Mi tablero (a1b2c3d4).jeopardy.json'), 'utf8')).toBe(
      '{"title":"Mi tablero"}',
    );
  });

  it('al cambiar el título reemplaza el archivo y deja uno solo', async () => {
    const store = createBackupStore(dir);
    await store.writeBoard(file('Otro', OTHER_ID));
    await store.writeBoard(file('Título viejo'));
    await store.writeBoard(file('Título nuevo'));
    expect(visibleFiles(dir)).toEqual([
      'Otro (ffff0000).jeopardy.json',
      'Título nuevo (a1b2c3d4).jeopardy.json',
    ]);
  });

  it('las escrituras seguidas del mismo tablero terminan con la última', async () => {
    const store = createBackupStore(dir);
    await Promise.all([
      store.writeBoard(file('Uno', BOARD_ID, '1')),
      store.writeBoard(file('Dos', BOARD_ID, '2')),
      store.writeBoard(file('Tres', BOARD_ID, '3')),
    ]);
    expect(visibleFiles(dir)).toEqual(['Tres (a1b2c3d4).jeopardy.json']);
    expect(readFileSync(path.join(dir, 'Tres (a1b2c3d4).jeopardy.json'), 'utf8')).toBe('3');
  });

  it('al eliminar mueve el respaldo a eliminados, reemplazando uno anterior', async () => {
    const store = createBackupStore(dir);
    await store.writeBoard(file('Mi tablero', BOARD_ID, 'viejo'));
    await store.trashBoard(BOARD_ID);
    await store.writeBoard(file('Mi tablero', BOARD_ID, 'nuevo'));
    await store.writeBoard(file('Otro', OTHER_ID));
    await store.trashBoard(BOARD_ID);

    expect(visibleFiles(dir)).toEqual(['Otro (ffff0000).jeopardy.json']);
    const trash = path.join(dir, TRASH_DIR_NAME);
    expect(readdirSync(trash)).toEqual(['Mi tablero (a1b2c3d4).jeopardy.json']);
    expect(readFileSync(path.join(trash, 'Mi tablero (a1b2c3d4).jeopardy.json'), 'utf8')).toBe(
      'nuevo',
    );
  });

  it('eliminar un tablero sin respaldo no hace nada', async () => {
    await createBackupStore(dir).trashBoard(BOARD_ID);
    expect(existsSync(path.join(dir, TRASH_DIR_NAME))).toBe(false);
  });

  it('rechaza la promesa si la carpeta no se puede escribir', async () => {
    // Un archivo donde debería estar la carpeta: no se puede crear ni escribir dentro.
    writeFileSync(dir, 'no soy una carpeta');
    await expect(createBackupStore(dir).writeBoard(file('Mi tablero'))).rejects.toThrow();
  });

  it('rechaza nombres que no son de ese tablero o que salen de la carpeta', async () => {
    const store = createBackupStore(dir);
    const bad = [
      { ...file('Mi tablero'), fileName: '../Mi tablero (a1b2c3d4).jeopardy.json' },
      { ...file('Mi tablero'), fileName: 'sub\\Mi tablero (a1b2c3d4).jeopardy.json' },
      { ...file('Mi tablero'), fileName: 'Mi tablero (ffff0000).jeopardy.json' },
      { ...file('Mi tablero'), fileName: 'Mi tablero (a1b2c3d4).exe' },
    ];
    for (const entry of bad) await expect(store.writeBoard(entry)).rejects.toThrow();
    expect(visibleFiles(dir)).toEqual([]);
  });
});
