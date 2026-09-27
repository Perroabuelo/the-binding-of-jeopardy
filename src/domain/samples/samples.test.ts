import { describe, expect, it } from 'vitest';
import { BOARD_SCHEMA_VERSION, CLUE_VALUES } from '../board';
import { exportBoard, importBoard } from '../exchange';
import { isFinalComplete, validateBoard } from '../validation';
import { createBoardFromSample, SAMPLE_BOARDS } from '.';

const NOW = 1_800_000_000_000;

describe('SAMPLE_BOARDS', () => {
  it('las claves de los ejemplos son únicas', () => {
    const ids = SAMPLE_BOARDS.map((sample) => sample.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(SAMPLE_BOARDS.map((sample) => [sample.id, sample] as const))('%s', (_, sample) => {
    const board = createBoardFromSample(sample, 'tablero-1', NOW);

    it('tiene clave, título y descripción', () => {
      expect(sample.id.trim()).not.toBe('');
      expect(sample.title.trim()).not.toBe('');
      expect(sample.description.trim()).not.toBe('');
    });

    it('queda listo para jugar, con la pista final completa', () => {
      expect(validateBoard(board)).toEqual({ ready: true, missing: [] });
      expect(isFinalComplete(board.final)).toBe(true);
    });

    it('tiene 6 categorías con valores de 100 a 500', () => {
      expect(board.categories).toHaveLength(6);
      for (const category of board.categories) {
        expect(category.clues.map((clue) => clue.value)).toEqual([...CLUE_VALUES]);
      }
    });

    it('tiene exactamente un Daily Double, en una fila de 300 a 500', () => {
      const dailyDoubles = board.categories
        .flatMap((category) => category.clues)
        .filter((clue) => clue.dailyDouble === true);
      expect(dailyDoubles).toHaveLength(1);
      expect(dailyDoubles[0]!.value).toBeGreaterThanOrEqual(300);
    });

    it('usa el id y la fecha recibidos', () => {
      expect(board).toMatchObject({
        id: 'tablero-1',
        schemaVersion: BOARD_SCHEMA_VERSION,
        title: sample.title,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });

    it('cada tablero creado es independiente del ejemplo y de los demás', () => {
      const snapshot = structuredClone(sample);
      const first = createBoardFromSample(sample, 'a', NOW);
      const second = createBoardFromSample(sample, 'b', NOW);
      first.categories[0]!.name = 'Cambiada';
      first.categories[0]!.clues[0]!.question = 'Cambiada';
      first.final!.answer = 'Cambiada';
      expect(second).toEqual(createBoardFromSample(sample, 'b', NOW));
      expect(sample).toEqual(snapshot);
    });

    it('la ida y vuelta por exportación conserva el contenido', () => {
      let n = 0;
      const { board: imported } = importBoard(exportBoard(board, {}), {
        makeId: () => `nuevo-${++n}`,
        now: NOW + 1,
      });
      expect(imported).toEqual({ ...board, id: 'nuevo-1', createdAt: NOW + 1, updatedAt: NOW + 1 });
    });
  });
});
