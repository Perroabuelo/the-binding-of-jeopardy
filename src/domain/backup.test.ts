import { describe, expect, it } from 'vitest';
import { backupFileName, isBackupOf } from './backup';

const ID = 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('backupFileName', () => {
  it('usa el nombre de exportación e incluye el id', () => {
    expect(backupFileName({ id: ID, title: 'Mi tablero' })).toBe(
      'Mi tablero (a1b2c3d4).jeopardy.json',
    );
  });

  it('sanea el título', () => {
    expect(backupFileName({ id: ID, title: 'Cumple: ¿quién?/"sabe"*' })).toBe(
      'Cumple ¿quién sabe (a1b2c3d4).jeopardy.json',
    );
    expect(backupFileName({ id: ID, title: '   ' })).toBe('tablero (a1b2c3d4).jeopardy.json');
    expect(backupFileName({ id: ID, title: 'CON' })).toBe('CON_ (a1b2c3d4).jeopardy.json');
  });

  it('sanea el id', () => {
    expect(backupFileName({ id: '../x/y', title: 'T' })).toBe('T (xy).jeopardy.json');
    expect(backupFileName({ id: '..', title: 'T' })).toBe('T (tablero).jeopardy.json');
  });
});

describe('isBackupOf', () => {
  it('reconoce los archivos del tablero con cualquier título', () => {
    expect(isBackupOf('Mi tablero (a1b2c3d4).jeopardy.json', ID)).toBe(true);
    expect(isBackupOf('Título viejo (a1b2c3d4).jeopardy.json', ID)).toBe(true);
  });

  it('no reconoce los de otros tableros ni otros archivos', () => {
    expect(isBackupOf('Mi tablero (ffffffff).jeopardy.json', ID)).toBe(false);
    expect(isBackupOf('Mi tablero (a1b2c3d4).json', ID)).toBe(false);
    expect(isBackupOf('Mi tablero.jeopardy.json', ID)).toBe(false);
    expect(isBackupOf('Mi tablero (xa1b2c3d4).jeopardy.json', ID)).toBe(false);
    expect(isBackupOf('.Mi tablero (a1b2c3d4).jeopardy.json.123.tmp', ID)).toBe(false);
  });
});
