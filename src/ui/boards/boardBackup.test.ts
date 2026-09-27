import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupFileName } from '../../domain/backup';
import type { Board } from '../../domain/board';
import { makeCompleteBoard } from '../../../tests/fixtures/board';
import { makeFakeDesktop, type FakeDesktop } from '../../../tests/fixtures/desktop';
import {
  BACKUP_DEBOUNCE_MS,
  BACKUP_FAILED_MESSAGE,
  createBoardBackup,
  TRASH_FAILED_MESSAGE,
  type BoardBackup,
} from './boardBackup';

let fake: FakeDesktop;
let backup: BoardBackup;
let failures: string[];
const build = vi.fn((board: Board) => Promise.resolve(`{"title":"${board.title}"}`));

function board(title: string, id = 'tablero-1'): Board {
  return makeCompleteBoard({ id, title });
}

beforeEach(() => {
  vi.useFakeTimers();
  build.mockClear();
  fake = makeFakeDesktop();
  backup = createBoardBackup({ desktop: () => fake.api, build });
  failures = [];
  backup.onFailure((message) => failures.push(message));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('boardBackup', () => {
  it('varios guardados seguidos producen una sola escritura, con el último', async () => {
    backup.schedule(board('Uno'));
    await vi.advanceTimersByTimeAsync(1000);
    backup.schedule(board('Dos'));
    await vi.advanceTimersByTimeAsync(1000);
    backup.schedule(board('Tres'));
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS - 1);
    expect(fake.api.backup.writeBoard).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(1);
    expect(fake.api.backup.writeBoard).toHaveBeenCalledWith({
      boardId: 'tablero-1',
      fileName: backupFileName(board('Tres')),
      json: '{"title":"Tres"}',
    });
  });

  it('cada tablero tiene su propio debounce', async () => {
    backup.schedule(board('A', 'a'));
    backup.schedule(board('B', 'b'));
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS);
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(2);
  });

  it('flush escribe de inmediato lo pendiente', async () => {
    backup.schedule(board('Uno'));
    await backup.flush('tablero-1');
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS);
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(1);
  });

  it('backupNow respalda sin esperar', async () => {
    await backup.backupNow(board('Nuevo'));
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(1);
  });

  it('una falla muestra el aviso y no rechaza', async () => {
    vi.mocked(fake.api.backup.writeBoard).mockRejectedValueOnce(new Error('sin permiso'));
    await expect(backup.backupNow(board('Uno'))).resolves.toBeUndefined();
    expect(failures).toEqual([BACKUP_FAILED_MESSAGE]);

    // El siguiente respaldo sigue funcionando.
    await backup.backupNow(board('Dos'));
    expect(fake.api.backup.writeBoard).toHaveBeenCalledTimes(2);
    expect(failures).toHaveLength(1);
  });

  it('eliminar cancela lo pendiente y mueve el respaldo', async () => {
    backup.schedule(board('Uno'));
    await backup.trash('tablero-1');
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS);
    expect(fake.api.backup.writeBoard).not.toHaveBeenCalled();
    expect(fake.api.backup.trashBoard).toHaveBeenCalledWith('tablero-1');
  });

  it('si falla eliminar, avisa', async () => {
    vi.mocked(fake.api.backup.trashBoard).mockRejectedValueOnce(new Error('ocupado'));
    await backup.trash('tablero-1');
    expect(failures).toEqual([TRASH_FAILED_MESSAGE]);
  });

  it('en la web no hace nada', async () => {
    const web = createBoardBackup({ desktop: () => null, build });
    web.schedule(board('Uno'));
    await web.backupNow(board('Dos'));
    await web.trash('tablero-1');
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS);
    expect(build).not.toHaveBeenCalled();
  });
});
